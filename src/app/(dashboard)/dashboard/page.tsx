import { createClient } from "../../utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces(id, name, created_at), role")
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.workspace) redirect("/onboarding");

  const workspace = membership.workspace as unknown as { id: string; name: string; created_at: string };

  // ── Role detection ────────────────────────────────────────────────────────
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspace.id)
    .single();

  const isOwner = ws?.owner_id === user.id;
  const memberRole = (membership.role as string)?.toLowerCase();
  const userRole: string = isOwner ? "owner" : (memberRole || "member");

  if (userRole === "client") redirect("/dashboard/client-view");

  // ── Projects ──────────────────────────────────────────────────────────────
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // ── Activity ──────────────────────────────────────────────────────────────
  const { data: recentActivity } = await supabase
    .from("team_activity")
    .select("id, description, activity_type, created_at, metadata, team_member_id")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // ── Sprints ───────────────────────────────────────────────────────────────
  const { data: sprints } = await supabase
    .from("sprints")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("end_date", { ascending: true });

  // ── Sprint tasks ──────────────────────────────────────────────────────────
  const { data: sprintTasks } = await supabase
    .from("sprint_tasks")
    .select("*")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // ── Team members (for performance widget, capped at 10) ───────────────────
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("id, user_id, full_name, job_title, status, avatar_url, performance_score")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("performance_score", { ascending: false, nullsFirst: false })
    .limit(10);

  // ── Team count (real total, not capped) ───────────────────────────────────
  const { count: teamMembersCount } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  // ── Current member record (for member-scoped dashboard) ───────────────────
  const { data: currentMember } = await supabase
    .from("team_members")
    .select("id, full_name, avatar_url, job_title")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalProjects    = projects?.length || 0;
  const endedProjects    = projects?.filter(p => p.status === "completed").length || 0;
  const runningProjects  = projects?.filter(p => p.status === "active" || (!p.status && p.ai_status === "completed")).length || 0;
  const pendingProjects  = projects?.filter(p => p.status === "pending" || p.status === "planning" || (!p.status && p.ai_status !== "completed")).length || 0;
  const activeSprintsCount = (sprints || []).filter(s => s.status !== "completed" && new Date(s.end_date) > new Date()).length;
  const completionRate   = totalProjects > 0 ? Math.round((endedProjects / totalProjects) * 100) : 0;

  // ── AI Milestones (from projects' ai_data) ────────────────────────────────
  const aiMilestones: { id: string; task_name: string; week_number: number; project_id: string; project: { name: string } }[] = [];
  (projects || [])
    .filter(p => p.status !== "completed")
    .forEach(p => {
      if (Array.isArray(p.ai_data?.milestones)) {
        p.ai_data.milestones.forEach((m: { title: string; week: number; status?: string }) => {
          if (m.status !== "completed") {
            aiMilestones.push({
              id:          `${p.id}-${m.week}-${m.title}`,
              task_name:   m.title,
              week_number: m.week,
              project_id:  p.id,
              project:     { name: p.name },
            });
          }
        });
      }
    });
  aiMilestones.sort((a, b) => a.week_number - b.week_number);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">
            Welcome back — here&apos;s what&apos;s happening in <span className="text-slate-600 font-semibold">{workspace.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}
          >
            <Plus size={16} /> New Project
          </Link>
        </div>
      </div>

      <DashboardClient
        stats={{ totalProjects, endedProjects, runningProjects, pendingProjects, activeSprintsCount, teamMembersCount: teamMembersCount ?? 0, completionRate }}
        projects={projects || []}
        activities={recentActivity || []}
        workspace={workspace}
        sprints={sprints || []}
        sprintTasks={sprintTasks || []}
        teamMembers={teamMembers || []}
        recentActivity={recentActivity || []}
        aiMilestones={aiMilestones}
        userRole={userRole}
        currentMember={currentMember ?? null}
        userId={user.id}
      />
    </div>
  );
}
