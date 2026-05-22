import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";

// DELETE /api/sprints/manage?id=<sprintId>  — soft-delete a sprint (any status)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sprintId = new URL(request.url).searchParams.get("id");
    if (!sprintId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = createAdminClient();

    const { data: sprint } = await admin
      .from("sprints")
      .select("id, name, project_id, workspace_id, status, deleted_at")
      .eq("id", sprintId)
      .maybeSingle();

    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    if (sprint.deleted_at) return NextResponse.json({ error: "Sprint already deleted" }, { status: 409 });

    // Verify user is a workspace member
    const { data: wsMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("workspace_id", sprint.workspace_id)
      .maybeSingle();

    if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get name for audit log
    const { data: teamMember } = await admin
      .from("team_members")
      .select("full_name")
      .eq("user_id", user.id)
      .eq("workspace_id", sprint.workspace_id)
      .maybeSingle();
    const deletedByName = teamMember?.full_name || "Unknown";

    // Soft-delete the sprint
    const { error } = await admin
      .from("sprints")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", sprintId);

    if (error) throw error;

    // Audit log
    await admin.from("deletion_audit_log").insert({
      entity_type: "sprint",
      entity_id: sprintId,
      entity_name: sprint.name,
      deleted_by: user.id,
      deleted_by_name: deletedByName,
      workspace_id: sprint.workspace_id,
      metadata: { project_id: sprint.project_id, sprint_status: sprint.status },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/sprints/manage?id=<sprintId>  — restore a soft-deleted sprint (within 30 days)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sprintId = new URL(request.url).searchParams.get("id");
    if (!sprintId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const admin = createAdminClient();

    const { data: sprint } = await admin
      .from("sprints")
      .select("id, workspace_id, deleted_at")
      .eq("id", sprintId)
      .maybeSingle();

    if (!sprint?.deleted_at) {
      return NextResponse.json({ error: "Sprint not found or not deleted" }, { status: 404 });
    }

    if (new Date(sprint.deleted_at).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Recovery window expired (30 days)" }, { status: 410 });
    }

    const { data: wsMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("workspace_id", sprint.workspace_id)
      .maybeSingle();

    if (!wsMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await admin
      .from("sprints")
      .update({ deleted_at: null })
      .eq("id", sprintId);

    if (error) throw error;

    await admin
      .from("deletion_audit_log")
      .update({ restored_at: new Date().toISOString(), restored_by: user.id })
      .eq("entity_id", sprintId)
      .eq("entity_type", "sprint")
      .is("restored_at", null);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
