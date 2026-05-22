import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { createAdminClient } from "../../utils/supabase/admin";

export const runtime = "nodejs";

// GET /api/my-sprint?workspaceId=<id>
// Returns the current user's active/planning sprints with their tasks.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    const admin = createAdminClient();

    // Verify workspace membership
    const { data: memberRow } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!memberRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get ALL team_member rows for this user in this workspace (active and deleted).
    // Tasks assigned before a re-add may reference an older team_members.id.
    const { data: memberRows } = await admin
      .from("team_members")
      .select("id, full_name, avatar_url, job_title")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id);

    if (!memberRows || memberRows.length === 0) {
      return NextResponse.json({ sprints: [], tasks: [], member: null });
    }

    // Prefer the active (non-deleted) row for display; fall back to the first found
    const activeMember = memberRows.find((m: any) => !m.deleted_at) ?? memberRows[0];
    const allMemberIds = memberRows.map((m: any) => m.id);

    // Fetch all sprint tasks assigned to ANY of the user's team_member rows
    const { data: sprintTaskRows } = await admin
      .from("sprint_tasks")
      .select("id, title, status, sprint_id, project_id, assigned_to")
      .eq("workspace_id", workspaceId)
      .in("assigned_to", allMemberIds)
      .is("deleted_at", null);

    if (!sprintTaskRows || sprintTaskRows.length === 0) {
      return NextResponse.json({ sprints: [], tasks: [], member: activeMember });
    }

    // Collect sprint IDs from those tasks
    const sprintIds = [...new Set(sprintTaskRows.map((t: any) => t.sprint_id).filter(Boolean))];

    // Fetch those sprints (only non-completed, non-deleted)
    const { data: sprintRows } = await admin
      .from("sprints")
      .select("id, name, status, start_date, end_date, project_id")
      .in("id", sprintIds)
      .neq("status", "completed")
      .is("deleted_at", null);

    if (!sprintRows || sprintRows.length === 0) {
      return NextResponse.json({ sprints: [], tasks: sprintTaskRows, member: activeMember });
    }

    // Fetch project names for context
    const projectIds = [...new Set(sprintRows.map((s: any) => s.project_id).filter(Boolean))];
    const { data: projectRows } = await admin
      .from("projects")
      .select("id, name")
      .in("id", projectIds);

    const projectMap = new Map((projectRows ?? []).map((p: any) => [p.id, p.name]));

    const enrichedSprints = sprintRows
      .map((s: any) => {
        const spTasks = sprintTaskRows.filter((t: any) => t.sprint_id === s.id);
        const done = spTasks.filter((t: any) => t.status === "done").length;
        return {
          ...s,
          project_name: projectMap.get(s.project_id) ?? null,
          task_count: spTasks.length,
          done_count: done,
          pct: spTasks.length > 0 ? Math.round((done / spTasks.length) * 100) : 0,
          days_left: Math.max(0, Math.floor((new Date(s.end_date).getTime() - Date.now()) / 86_400_000)),
        };
      })
      .sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

    return NextResponse.json({
      sprints: enrichedSprints,
      tasks: sprintTaskRows,
      member: activeMember,
    });
  } catch (err: unknown) {
    console.error("my-sprint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
