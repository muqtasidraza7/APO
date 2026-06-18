import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const admin = createAdminClient();

    const { data: project } = await supabase
      .from("projects")
      .select("name, workspace_id, ai_data")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const [
      { data: rawAssignments },
      { data: teamMembers },
      { data: scenarios },
      { data: history },
    ] = await Promise.all([
      admin
        .from("project_assignments")
        .select("id, task_name, week_number, match_reason, resource_id")
        .eq("project_id", projectId)
        .order("week_number", { ascending: true }),
      admin
        .from("team_members")
        .select("id, full_name, job_title, skills, capacity_hours_per_week, hourly_rate, performance_score, status")
        .eq("workspace_id", project.workspace_id),
      admin
        .from("allocation_scenarios")
        .select("id, name, source, note, created_by_name, assignments, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      admin
        .from("allocation_history")
        .select("id, action, note, performed_by_name, assignment_count, assignments_before, assignments_after, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const memberMap: Record<string, any> = {};
    for (const m of teamMembers || []) memberMap[m.id] = m;

    // Enrich assignments with member details
    const assignments = (rawAssignments || []).map(a => ({
      ...a,
      member: memberMap[a.resource_id] || null,
    }));

    return NextResponse.json({
      projectName: project.name,
      workspaceId: project.workspace_id,
      milestones: project.ai_data?.milestones || [],
      assignments,
      teamMembers: teamMembers || [],
      scenarios: scenarios || [],
      history: history || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
