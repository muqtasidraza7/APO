import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

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

    // 2. Auto-assign if unassigned and moved to active state
    if (status !== "backlog") {
      const { data: currentTask } = await supabase
        .from("sprint_tasks")
        .select("assigned_to")
        .eq("id", taskId)
        .maybeSingle();
      
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

    // 3. Log activity if project provided
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
              story_points: task.story_points || 0 
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
