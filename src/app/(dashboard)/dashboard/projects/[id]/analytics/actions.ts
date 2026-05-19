"use server";

import { createClient } from "../../../../../utils/supabase/server";
import { createAdminClient } from "../../../../../utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateProjectBudget(projectId: string, newBudget: number, note?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("ai_data, workspace_id")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) return { error: "Project not found" };

  // PM/owner check
  const [{ data: ws }, { data: callerMember }] = await Promise.all([
    supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single(),
    supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", project.workspace_id).maybeSingle(),
  ]);
  if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
    return { error: "Only owners and PMs can update the budget" };
  }

  const oldBudget = project.ai_data?.budget_estimate ?? null;
  const aiData = { ...(project.ai_data || {}) };
  aiData.budget_estimate = newBudget;

  const { error: updateError } = await supabase
    .from("projects")
    .update({ ai_data: aiData })
    .eq("id", projectId);

  if (updateError) return { error: "Failed to update budget" };

  // Log the change
  try {
    const { data: member } = await supabase
      .from("team_members")
      .select("full_name")
      .eq("user_id", user.id)
      .eq("workspace_id", project.workspace_id)
      .maybeSingle();

    const admin = createAdminClient();
    await admin.from("budget_change_log").insert({
      project_id: projectId,
      workspace_id: project.workspace_id,
      changed_by: user.id,
      changed_by_name: member?.full_name || user.email || "Unknown",
      old_value: oldBudget,
      new_value: newBudget,
      note: note || null,
    });
  } catch {
    // Non-fatal — budget was saved, log is best-effort
  }

  revalidatePath(`/dashboard/projects/${projectId}/analytics`);
  return { success: true };
}
