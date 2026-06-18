import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, workspaceId, name, goal, start_date, end_date, milestone_ids } = await request.json();

    if (!projectId || !workspaceId || !name || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields: name, start_date, end_date" }, { status: 400 });
    }

    // Verify PM or owner
    const [{ data: ws }, { data: callerMember }] = await Promise.all([
      supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
      supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle(),
    ]);
    const isOwner = ws?.owner_id === user.id;
    if (!isOwner && callerMember?.role !== "pm") {
      return NextResponse.json({ error: "Only owners and PMs can create sprints" }, { status: 403 });
    }

    // milestone_ids is optional array; default to empty array
    const milestoneArray = Array.isArray(milestone_ids) ? milestone_ids : [];

    // Block sprint creation for already-completed milestones
    if (milestoneArray.length > 0) {
      const { data: project } = await supabase
        .from("projects")
        .select("ai_data")
        .eq("id", projectId)
        .single();

      const aiMilestones: any[] = project?.ai_data?.milestones || [];
      const completedTitles = new Set(
        aiMilestones
          .filter((m) => m.status === "completed")
          .map((m) => (m.title || m.task_name || "").trim().toLowerCase())
      );

      const blocked = milestoneArray.find((t: string) =>
        completedTitles.has(t.trim().toLowerCase())
      );

      if (blocked) {
        return NextResponse.json(
          { error: `"${blocked}" is already completed. Sprints cannot be created for completed milestones.` },
          { status: 400 }
        );
      }
    }

    const { data: sprint, error } = await supabase
      .from("sprints")
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        name,
        goal: goal || null,
        start_date,
        end_date,
        status: "planning",
        milestone_ids: milestoneArray,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, sprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
