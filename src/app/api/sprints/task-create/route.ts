import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createNotification } from "../../../utils/notifications";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sprintId, projectId, workspaceId, title, description, effort_level, time_estimate_hours, priority, assigned_to } = await request.json();

    if (!sprintId || !projectId || !workspaceId || !title) {
      return NextResponse.json({ error: "sprintId, projectId, workspaceId, and title are required" }, { status: 400 });
    }

    // PM/owner check
    const [{ data: ws }, { data: callerMember }] = await Promise.all([
      supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
      supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle(),
    ]);
    if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
      return NextResponse.json({ error: "Only owners and PMs can create tasks" }, { status: 403 });
    }

    const { data: task, error } = await supabase
      .from("sprint_tasks")
      .insert({
        sprint_id: sprintId,
        project_id: projectId,
        workspace_id: workspaceId,
        title,
        description: description || null,
        effort_level: effort_level || "medium",
        time_estimate_hours: time_estimate_hours || null,
        priority: priority || "medium",
        assigned_to: assigned_to || null,
        status: "backlog",
        created_by_ai: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Log assignment activity if assigned_to is set (assigned_to = team_member.id)
    if (task.assigned_to) {
      try {
        const { data: member } = await supabase
          .from("team_members")
          .select("id, workspace_id")
          .eq("id", task.assigned_to)
          .single();

        if (member) {
          await supabase.from("team_activity").insert({
            workspace_id: workspaceId,
            team_member_id: member.id,
            activity_type: "task_assigned",
            description: `Assigned to sprint task "${task.title}"`,
            metadata: {
              task_title: task.title,
              sprint_id: task.sprint_id,
              effort_level: task.effort_level,
              time_estimate_hours: task.time_estimate_hours,
            },
          });

          // Notify the assignee (skip if they assigned it themselves)
          const { data: memberFull } = await supabase
            .from("team_members")
            .select("user_id")
            .eq("id", member.id)
            .maybeSingle();
          if (memberFull?.user_id && memberFull.user_id !== user.id) {
            createNotification({
              userId: memberFull.user_id,
              type: "task_assigned",
              title: "New task assigned",
              body: `You were assigned to "${task.title}"`,
              link: `/dashboard/projects/${task.project_id}/sprints`,
            });
          }
        }
      } catch (logErr) {
        console.warn("Activity log failed, continuing:", logErr);
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
