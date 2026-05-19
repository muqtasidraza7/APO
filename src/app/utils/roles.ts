import { createAdminClient } from "./supabase/admin";

export type AppRole = "owner" | "pm" | "member" | "client";

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  pm: "Project Manager",
  member: "Team Member",
  client: "Client",
};

export const ROLE_COLORS: Record<AppRole, string> = {
  owner: "bg-violet-100 text-violet-700 border-violet-200",
  pm: "bg-indigo-100 text-indigo-700 border-indigo-200",
  member: "bg-slate-100 text-slate-600 border-slate-200",
  client: "bg-amber-100 text-amber-700 border-amber-200",
};

export async function getUserRole(userId: string, workspaceId: string): Promise<AppRole> {
  const admin = createAdminClient();

  const { data: ws } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (ws?.owner_id === userId) return "owner";

  const { data: member } = await admin
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const r = (member?.role as string | null)?.toLowerCase();
  if (r === "pm") return "pm";
  if (r === "client") return "client";
  return "member";
}

export function canManageProject(role: AppRole): boolean {
  return role === "owner" || role === "pm";
}

export function canManageTeam(role: AppRole): boolean {
  return role === "owner" || role === "pm";
}

export function canViewAnalytics(role: AppRole): boolean {
  return role === "owner" || role === "pm";
}

export function canCreateSprint(role: AppRole): boolean {
  return role === "owner" || role === "pm";
}

export function canDeleteSprint(role: AppRole): boolean {
  return role === "owner" || role === "pm";
}
