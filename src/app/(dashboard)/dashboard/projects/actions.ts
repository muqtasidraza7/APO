"use server";

import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function auditDeletion(
  userId: string,
  entityType: string,
  entityId: string,
  entityName: string,
  workspaceId: string,
  extra: Record<string, unknown> = {}
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
      metadata: extra,
    });
  } catch {
    // Non-fatal
  }
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const file = formData.get("file") as File;
  const projectName = formData.get("projectName") as string;
  const workspaceId = formData.get("workspaceId") as string;

  console.log("Starting Upload for:", projectName); 

  if (!file || !projectName || !workspaceId) {
    return { error: "Missing required fields" };
  }

  // RBAC check
  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  const { data: wsMember } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  const isAdmin = ws?.owner_id === user.id || wsMember?.role === "pm";

  if (!isAdmin) {
    return { error: "Only Project Managers can create projects" };
  }

  if (!file || !projectName || !workspaceId) {
    return { error: "Missing required fields" };
  }

  const filePath = `${workspaceId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload Error:", uploadError);
    return { error: `Upload Failed: ${uploadError.message}` };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("project-files")
    .getPublicUrl(filePath);

  const { data: project, error: dbError } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      owner_id: user.id,
      name: projectName,
      original_file_url: publicUrl,
      ai_status: 'parsing',
      status: 'active',
    })
    .select()
    .single();

  if (dbError) {
    console.error("Database Insert Error:", dbError); 
    return { error: `DB Save Failed: ${dbError.message}` };
  }

  if (!project) {
    console.error("Project is null after insert");
    return { error: "Project creation failed silently" };
  }

  console.log("Project Created Successfully:", project.id); 

  redirect(`/dashboard/projects/${project.id}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, name")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();
  if (!project) return { error: "Project not found" };

  // RBAC check
  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single();
  const { data: wsMember } = await supabase.from("workspace_members").select("role").eq("workspace_id", project.workspace_id).eq("user_id", user.id).maybeSingle();
  const isAdmin = ws?.owner_id === user.id || wsMember?.role === "pm";

  if (!isAdmin) {
    return { error: "Only Project Managers can delete projects" };
  }

  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { error: `Failed to delete project: ${error.message}` };

  await auditDeletion(user.id, "project", projectId, project.name, project.workspace_id);

  revalidatePath("/dashboard/projects");
  return { success: true };
}

export async function restoreProject(projectId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, name, deleted_at")
    .eq("id", projectId)
    .not("deleted_at", "is", null)
    .single();
  if (!project) return { error: "Project not found or already restored" };

  // 30-day recovery window
  if (new Date(project.deleted_at!).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
    return { error: "Recovery window has expired (30 days)" };
  }

  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single();
  const { data: wsMember } = await supabase.from("workspace_members").select("role").eq("workspace_id", project.workspace_id).eq("user_id", user.id).maybeSingle();
  const isAdmin = ws?.owner_id === user.id || wsMember?.role === "pm";
  if (!isAdmin) return { error: "Only Project Managers can restore projects" };

  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  // Mark audit entry as restored
  const admin = createAdminClient();
  await admin
    .from("deletion_audit_log")
    .update({ restored_at: new Date().toISOString(), restored_by: user.id })
    .eq("entity_id", projectId)
    .eq("entity_type", "project")
    .is("restored_at", null);

  revalidatePath("/dashboard/projects");
  return { success: true };
}

export async function updateProjectStatus(projectId: string, status: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  // Get project workspace first
  const { data: project } = await supabase.from("projects").select("workspace_id").eq("id", projectId).single();
  if (!project) return { error: "Project not found" };

  // RBAC check
  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single();
  const { data: wsMember } = await supabase.from("workspace_members").select("role").eq("workspace_id", project.workspace_id).eq("user_id", user.id).maybeSingle();
  const isAdmin = ws?.owner_id === user.id || wsMember?.role === "pm";

  if (!isAdmin) {
    return { error: "Only Project Managers can update project status" };
  }

  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);

  if (error) {
    console.error("Error updating project status:", error);
    return { error: `Failed to update project status: ${error.message}` };
  }

  return { success: true };
}