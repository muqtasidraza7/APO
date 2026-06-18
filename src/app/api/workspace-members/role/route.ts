import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

// PATCH /api/workspace-members/role
// Body: { targetUserId, workspaceId, newRole: "pm" | "member" }
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUserId, workspaceId, newRole } = await request.json();

    if (!targetUserId || !workspaceId || !newRole) {
      return NextResponse.json({ error: "targetUserId, workspaceId, newRole required" }, { status: 400 });
    }
    if (newRole !== "pm" && newRole !== "member") {
      return NextResponse.json({ error: "newRole must be 'pm' or 'member'" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Caller must be owner or pm of this workspace
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const { data: callerMember } = await admin
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const isOwner = ws?.owner_id === user.id;
    const callerRole = callerMember?.role as string | null;
    if (!isOwner && callerRole !== "pm") {
      return NextResponse.json({ error: "Only owners and PMs can change roles" }, { status: 403 });
    }

    // Cannot change the owner's role
    if (targetUserId === ws?.owner_id) {
      return NextResponse.json({ error: "Cannot change the workspace owner's role" }, { status: 400 });
    }

    // PMs cannot promote someone to pm (only owners can do that)
    if (!isOwner && newRole === "pm") {
      return NextResponse.json({ error: "Only the owner can promote to Project Manager" }, { status: 403 });
    }

    // Update workspace_members.role
    const { error } = await admin
      .from("workspace_members")
      .update({ role: newRole })
      .eq("user_id", targetUserId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newRole });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
