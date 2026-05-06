import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sprintId, projectId, workspaceId, title, description, story_points, priority, assigned_to } = await request.json();

    if (!sprintId || !projectId || !workspaceId || !title) {
      return NextResponse.json({ error: "sprintId, projectId, workspaceId, and title are required" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("sprint_tasks")
      .insert({
        sprint_id: sprintId,
        project_id: projectId,
        workspace_id: workspaceId,
        title,
        description: description || null,
        story_points: story_points || 3,
        priority: priority || "medium",
        assigned_to: assigned_to || null,
        status: "backlog",
        created_by_ai: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Log assignment activity if assigned_to is set
    if (task.assigned_to) {
      const { data: member } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", task.assigned_to)
        .eq("workspace_id", workspaceId)
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
            estimated_hours: (task.story_points || 3) * 2 // Heuristic: 1 SP = 2 hours
          },
        });
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
