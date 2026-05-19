import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";

// POST /api/project-shares — create a share token (PM/owner only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, workspaceId, expiresInDays } = await request.json();
    if (!projectId || !workspaceId) {
      return NextResponse.json({ error: "projectId and workspaceId are required" }, { status: 400 });
    }

    // PM/owner check
    const [{ data: ws }, { data: callerMember }] = await Promise.all([
      supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
      supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle(),
    ]);
    if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
      return NextResponse.json({ error: "Only owners and PMs can create share links" }, { status: 403 });
    }

    const expires_at = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null;

    const { data: share, error } = await supabase
      .from("project_shares")
      .insert({
        project_id: projectId,
        workspace_id: workspaceId,
        created_by: user.id,
        expires_at,
        is_active: true,
      })
      .select("token, expires_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, token: share.token, expires_at: share.expires_at });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/project-shares?projectId=... — list active share tokens for a project
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const { data: shares } = await supabase
      .from("project_shares")
      .select("id, token, created_at, expires_at, is_active")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return NextResponse.json({ shares: shares || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/project-shares?id=... — deactivate a share token
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const shareId = request.nextUrl.searchParams.get("id");
    if (!shareId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase
      .from("project_shares")
      .update({ is_active: false })
      .eq("id", shareId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
