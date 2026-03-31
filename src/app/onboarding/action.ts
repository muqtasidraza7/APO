"use server";

import { createClient } from "../utils/supabase/server";
import { createAdminClient } from "../utils/supabase/admin";
import { redirect } from "next/navigation";

interface SkillProfile {
  skills: string[];
  job_title?: string;
  experience_level?: string;
  years_of_experience?: number;
  cv_url?: string;
}

export async function createWorkspace(workspaceName: string, skillProfile?: SkillProfile) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName,
      owner_id: user.id,
    })
    .select()
    .single();

  if (wsError) {
    console.error("Workspace Error:", wsError.message);
    return { error: `Failed to create workspace: ${wsError.message}` };
  }

  const memberData: Record<string, unknown> = {
    workspace_id: workspace.id,
    user_id: user.id,
    role: "PM",
  };

  if (skillProfile) {
    memberData.user_skills = skillProfile.skills || [];
    if (skillProfile.job_title) memberData.job_title = skillProfile.job_title;
    if (skillProfile.experience_level) memberData.experience_level = skillProfile.experience_level;
    if (skillProfile.years_of_experience) memberData.years_of_experience = skillProfile.years_of_experience;
    if (skillProfile.cv_url) memberData.user_cv_url = skillProfile.cv_url;
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert(memberData);

  if (memberError) {
    console.error("Member Error:", memberError.message);
    return { error: "Failed to join workspace" };
  }

  redirect("/dashboard");
}

export async function joinWorkspace(workspaceId: string, skillProfile?: SkillProfile) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set in .env");
    return { error: "Server configuration error. Please contact support." };
  }

  const adminSupabase = createAdminClient();
  // Extract just the UUID whether user pasted a full URL or just the ID
  let trimmedId = workspaceId.trim();
  try {
    const url = new URL(trimmedId);
    const inviteParam = url.searchParams.get("invite");
    if (inviteParam) trimmedId = inviteParam.trim();
  } catch {
    // Not a URL, use value as-is
  }

  console.log("Attempting to join workspace ID:", trimmedId);

  // Use admin client to bypass RLS — new users can't see workspaces they don't own yet
  const { data: workspace, error: wsError } = await adminSupabase
    .from("workspaces")
    .select("id")
    .eq("id", trimmedId)
    .single();

  if (wsError || !workspace) {
    console.error("Workspace lookup failed:", wsError?.message, wsError?.code, "| ID:", trimmedId);
    return { error: "Workspace not found or invalid ID" };
  }

  console.log("Workspace found:", workspace.id);

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    redirect("/dashboard");
  }

  const memberData: Record<string, unknown> = {
    workspace_id: workspace.id,
    user_id: user.id,
    role: "WORKER",
  };

  if (skillProfile) {
    memberData.user_skills = skillProfile.skills || [];
    if (skillProfile.job_title) memberData.job_title = skillProfile.job_title;
    if (skillProfile.experience_level) memberData.experience_level = skillProfile.experience_level;
    if (skillProfile.years_of_experience) memberData.years_of_experience = skillProfile.years_of_experience;
    if (skillProfile.cv_url) memberData.user_cv_url = skillProfile.cv_url;
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert(memberData);

  if (memberError) {
    console.error("Join Error:", memberError.message);
    return { error: "Failed to join workspace" };
  }

  redirect("/dashboard");
}

export async function updateSkillProfile(skillProfile: SkillProfile) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updateData: Record<string, unknown> = {
    user_skills: skillProfile.skills || [],
  };
  if (skillProfile.job_title !== undefined) updateData.job_title = skillProfile.job_title;
  if (skillProfile.experience_level !== undefined) updateData.experience_level = skillProfile.experience_level;
  if (skillProfile.years_of_experience !== undefined) updateData.years_of_experience = skillProfile.years_of_experience;
  if (skillProfile.cv_url !== undefined) updateData.user_cv_url = skillProfile.cv_url;

  const { error } = await supabase
    .from("workspace_members")
    .update(updateData)
    .eq("user_id", user.id);

  if (error) {
    console.error("Skill Update Error:", error.message);
    return { error: "Failed to update skill profile" };
  }

  return { success: true };
}