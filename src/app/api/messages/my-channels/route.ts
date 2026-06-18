import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";

// GET /api/messages/my-channels?workspaceId=<id>
// Returns visible projects + workspace team members using admin client (bypasses RLS).
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    const admin = createAdminClient();

    // Verify workspace membership and resolve role
    const [{ data: wsMember }, { data: workspace }] = await Promise.all([
      admin.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle(),
      admin.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle(),
    ]);

    const isOwner = workspace?.owner_id === user.id;
    if (!isOwner && !wsMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wsRole = isOwner ? "owner" : ((wsMember?.role as string) ?? "member").toLowerCase();
    const isOwnerOrPM = wsRole === "owner" || wsRole === "pm";

    // Get the team_members PK for this user (needed for assignment checks below)
    const { data: myTeamMember } = await admin
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const teamMemberId = myTeamMember?.id ?? null;

    // All workspace projects
    const { data: allProjects } = await admin
      .from("projects")
      .select("id, name")
      .eq("workspace_id", workspaceId);

    let visibleProjects = allProjects ?? [];

    // Non-owner/pm: only show projects the member is assigned to.
    // Check both project_assignments (AI allocation) AND sprint_tasks (manual task assignment).
    if (!isOwnerOrPM) {
      if (!teamMemberId) {
        visibleProjects = [];
      } else {
        const [{ data: paRows }, { data: stRows }] = await Promise.all([
          admin
            .from("project_assignments")
            .select("project_id")
            .eq("resource_id", teamMemberId),
          admin
            .from("sprint_tasks")
            .select("project_id")
            .eq("assigned_to", teamMemberId)
            .eq("workspace_id", workspaceId),
        ]);

        const assignedIds = new Set<string>([
          ...(paRows ?? []).map((a) => a.project_id as string).filter(Boolean),
          ...(stRows ?? []).map((t) => t.project_id as string).filter(Boolean),
        ]);

        visibleProjects = visibleProjects.filter((p) => assignedIds.has(p.id));
      }
    }

    // All workspace team_members for @mention autocomplete + sender name resolution
    const { data: tmRows } = await admin
      .from("team_members")
      .select("user_id, full_name, avatar_url")
      .eq("workspace_id", workspaceId);

    const memberList = (tmRows ?? [])
      .filter((m) => m.user_id && m.full_name)
      .map((m) => ({
        user_id: m.user_id as string,
        full_name: m.full_name as string,
        avatar_url: (m.avatar_url as string | null) ?? null,
      }));

    // If the current user is not in team_members (e.g. workspace owner with no team row),
    // add them from auth metadata so their name resolves in the sender map.
    const alreadyInList = memberList.some((m) => m.user_id === user.id);
    if (!alreadyInList) {
      const { data: { user: authMeta } } = await admin.auth.admin.getUserById(user.id);
      const name =
        (authMeta?.user_metadata?.full_name as string | undefined)?.trim() ||
        (authMeta?.user_metadata?.name as string | undefined)?.trim() ||
        authMeta?.email?.split("@")[0] ||
        "Unknown";
      memberList.push({ user_id: user.id, full_name: name, avatar_url: null });
    }

    return NextResponse.json({
      success: true,
      role: wsRole,
      teamMemberId,
      projects: visibleProjects,
      members: memberList,
      memberCount: (tmRows ?? []).length,
    });
  } catch (error: unknown) {
    console.error("my-channels error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
