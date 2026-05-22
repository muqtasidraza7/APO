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
  capacity_hours_per_week?: number;
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
    return { error: `Failed to create workspace: ${wsError.message}` };
  }

  const memberData: Record<string, unknown> = {
    workspace_id: workspace.id,
    user_id: user.id,
    role: "pm",
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
    return { error: "Failed to join workspace" };
  }

  // Insert owner into team_members so they appear in their own team dashboard
  const teamMemberData = {
    workspace_id: workspace.id,
    user_id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Admin",
    job_title: skillProfile?.job_title || "Project Manager",
    capacity_hours_per_week: skillProfile?.capacity_hours_per_week || 40,
    status: "online",
    skills: skillProfile?.skills || []
  };

  const { error: tmError } = await supabase.from("team_members").insert(teamMemberData);
  if (tmError) {
    console.error("[createWorkspace] team_members insert failed:", tmError.message);
    // Non-fatal: workspace was created — user can still access dashboard
  }

  redirect("/dashboard");
}

export async function joinWorkspace(workspaceId: string, skillProfile?: SkillProfile, inviteRole?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Server configuration error. Please contact support." };
  }

  const adminSupabase = createAdminClient();
  let trimmedId = workspaceId.trim();
  try {
    const url = new URL(trimmedId);
    const inviteParam = url.searchParams.get("invite");
    if (inviteParam) trimmedId = inviteParam.trim();
  } catch {
    // Not a URL, use value as-is
  }

  const { data: workspace, error: wsError } = await adminSupabase
    .from("workspaces")
    .select("id")
    .eq("id", trimmedId)
    .single();

  if (wsError || !workspace) {
    return { error: "Workspace not found or invalid ID" };
  }

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

  const assignedRole = inviteRole === "pm" ? "pm" : inviteRole === "client" ? "client" : "member";

  const memberData: Record<string, unknown> = {
    workspace_id: workspace.id,
    user_id: user.id,
    role: assignedRole,
  };

  if (skillProfile) {
    memberData.user_skills = skillProfile.skills || [];
    if (skillProfile.job_title) memberData.job_title = skillProfile.job_title;
    if (skillProfile.experience_level) memberData.experience_level = skillProfile.experience_level;
    if (skillProfile.years_of_experience) memberData.years_of_experience = skillProfile.years_of_experience;
    if (skillProfile.cv_url) memberData.user_cv_url = skillProfile.cv_url;
  }

  const { error: memberError } = await adminSupabase
    .from("workspace_members")
    .insert(memberData);

  if (memberError) {
    return { error: "Failed to join workspace" };
  }

  // Only insert into team_members for non-client roles
  // Clients are stakeholders and should NOT appear in the team member roster
  if (assignedRole !== "client") {
    const teamMemberData = {
      workspace_id: workspace.id,
      user_id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Member",
      job_title: skillProfile?.job_title || (assignedRole === "pm" ? "Project Manager" : "Team Member"),
      capacity_hours_per_week: skillProfile?.capacity_hours_per_week || 40,
      status: "online",
      skills: skillProfile?.skills || []
    };

    const { error: tmError } = await adminSupabase.from("team_members").insert(teamMemberData);
    if (tmError) {
      console.error("[joinWorkspace] team_members insert failed:", tmError.message);
      // Return a visible error so the user knows to contact support
      return { error: `Joined workspace but failed to create team profile: ${tmError.message}` };
    }
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
    return { error: "Failed to update skill profile" };
  }

  return { success: true };
}