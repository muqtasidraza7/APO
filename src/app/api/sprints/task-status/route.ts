import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

// Recomputes milestone status from sprint task reality and writes it back to ai_data.
// Runs after every task status change — covers both completion and reopening.
async function syncMilestoneStatus(supabase: SupabaseClient, task: any) {
  if (!task.parent_milestone_id || !task.project_id) return;

  // All tasks across ALL sprints for this milestone
  const { data: allTasks } = await supabase
    .from("sprint_tasks")
    .select("status")
    .eq("project_id", task.project_id)
    .eq("parent_milestone_id", task.parent_milestone_id);

  if (!allTasks || allTasks.length === 0) return;

  const total = allTasks.length;
  const doneCount = allTasks.filter((t) => t.status === "done").length;
  const allDone = doneCount === total;
  const anyActive = allTasks.some(
    (t) => t.status === "in_progress" || t.status === "in_review"
  );

  const newStatus = allDone ? "completed" : anyActive ? "in_progress" : "pending";
  const newPct = allDone ? 100 : Math.round((doneCount / total) * 100);

  const { data: project } = await supabase
    .from("projects")
    .select("ai_data")
    .eq("id", task.project_id)
    .single();

  if (!project?.ai_data?.milestones) return;

  const milestoneTitle = task.parent_milestone_id;
  let changed = false;

  const updatedMilestones = project.ai_data.milestones.map((m: any) => {
    const key = m.title || m.task_name;
    if (key === milestoneTitle && m.status !== newStatus) {
      changed = true;
      return {
        ...m,
        status: newStatus,
        completion_percentage: newPct,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        completed_by: null,
      };
    }
    return m;
  });

  if (!changed) return;

  await supabase
    .from("projects")
    .update({ ai_data: { ...project.ai_data, milestones: updatedMilestones } })
    .eq("id", task.project_id);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, status, projectId } = await request.json();
    if (!taskId || !status) return NextResponse.json({ error: "taskId and status required" }, { status: 400 });

    const validStatuses = ["backlog", "in_progress", "in_review", "done"];
    if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const updates: any = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    // Role + ownership check
    const { data: currentTask } = await supabase
      .from("sprint_tasks")
      .select("assigned_to, workspace_id")
      .eq("id", taskId)
      .maybeSingle();

    if (currentTask) {
      const [{ data: ws }, { data: callerMember }, { data: memberRecord }] = await Promise.all([
        supabase.from("workspaces").select("owner_id").eq("id", currentTask.workspace_id).single(),
        supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", currentTask.workspace_id).maybeSingle(),
        supabase.from("team_members").select("id").eq("user_id", user.id).eq("workspace_id", currentTask.workspace_id).maybeSingle(),
      ]);
      const isOwner = ws?.owner_id === user.id;
      const isPM = callerMember?.role === "pm";
      const isOwnTask = currentTask.assigned_to && memberRecord?.id === currentTask.assigned_to;
      if (!isOwner && !isPM && !isOwnTask) {
        return NextResponse.json({ error: "You can only update tasks assigned to you" }, { status: 403 });
      }
    }

    // 2. Auto-assign if unassigned and moved to active state
    if (status !== "backlog") {
      if (currentTask && !currentTask.assigned_to) {
        // Find the team member ID for this user in this workspace
        const { data: member } = await supabase
          .from("team_members")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (member) {
          updates.assigned_to = member.id;
        }
      }
    }

    const { data: task, error: updateError } = await supabase
      .from("sprint_tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Task Update Error:", updateError);
      throw updateError;
    }

    if (!task) {
       return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 3. Sync milestone completion (fires and is awaited; failure is non-fatal)
    try {
      await syncMilestoneStatus(supabase, task);
    } catch (syncErr) {
      console.warn("Milestone sync failed, continuing:", syncErr);
    }

    // 4. Log activity if project provided
    if (projectId && status === "done") {
      try {
        const { data: member } = await supabase
          .from("team_members")
          .select("id, workspace_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (member) {
          await supabase.from("team_activity").insert({
            workspace_id: member.workspace_id,
            team_member_id: member.id,
            activity_type: "task_completed",
            description: `Sprint task "${task.title}" marked as Done`,
            metadata: { 
              task_title: task.title, 
              sprint_id: task.sprint_id,
              time_estimate_hours: task.time_estimate_hours || 0 
            },
          });
        }
      } catch (logError) {
        console.warn("Failed to log activity, but continuing:", logError);
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("Critical Task Status Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
