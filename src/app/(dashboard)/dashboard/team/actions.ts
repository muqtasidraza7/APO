"use server";

import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import { revalidatePath } from "next/cache";

async function auditDeletion(
  userId: string,
  entityType: string,
  entityId: string,
  entityName: string,
  workspaceId: string
) {
  try {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("team_members")
      .select("full_name")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    await admin.from("deletion_audit_log").insert({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      deleted_by: userId,
      deleted_by_name: member?.full_name || "Unknown",
      workspace_id: workspaceId,
      metadata: {},
    });
  } catch {
    // Non-fatal
  }
}

export async function removeTeamMember(memberId: string, workspaceId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the caller is a PM/admin in this workspace
  const { data: caller } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!caller || (caller.role !== "pm" && caller.role !== "owner")) {
    return { error: "Only workspace admins can remove members" };
  }

  // Get member name for audit before deleting
  const admin = createAdminClient();
  const { data: memberRow } = await admin
    .from("team_members")
    .select("full_name")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // Soft-delete on team_members (the canonical table)
  const { error } = await admin
    .from("team_members")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Error removing team member:", error);
    return { error: `Failed to remove member: ${error.message}` };
  }

  await auditDeletion(
    user.id,
    "team_member",
    memberId,
    memberRow?.full_name || "Unknown Member",
    workspaceId
  );

  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function restoreTeamMember(memberId: string, workspaceId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: caller } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!caller || (caller.role !== "pm" && caller.role !== "owner")) {
    return { error: "Only workspace admins can restore members" };
  }

  const admin = createAdminClient();
  const { data: memberRow } = await admin
    .from("team_members")
    .select("deleted_at")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!memberRow?.deleted_at) return { error: "Member is not deleted" };

  if (new Date(memberRow.deleted_at).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
    return { error: "Recovery window has expired (30 days)" };
  }

  const { error } = await admin
    .from("team_members")
    .update({ deleted_at: null })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (error) return { error: error.message };

  await admin
    .from("deletion_audit_log")
    .update({ restored_at: new Date().toISOString(), restored_by: user.id })
    .eq("entity_id", memberId)
    .eq("entity_type", "team_member")
    .is("restored_at", null);

  revalidatePath("/dashboard/team");
  return { success: true };
}
