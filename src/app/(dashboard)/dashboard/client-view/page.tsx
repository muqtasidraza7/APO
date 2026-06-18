import { createClient } from "../../../utils/supabase/server";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, FolderKanban, Calendar } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AiMilestone = { title: string; week: number; status?: string };

interface ProjectRaw {
  id: string;
  name: string;
  status?: string;
  ai_status?: string;
  ai_data?: { milestones?: AiMilestone[] } | null;
  created_at: string;
}

interface TeamMemberSlim {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  completed: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Completed",
  },
  active: {
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    label: "Active",
  },
  pending: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    label: "Planning",
  },
  planning: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    label: "Planning",
  },
} as const;
type StatusKey = keyof typeof STATUS_CFG;

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length > 1
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const GRADIENTS = [
  "from-indigo-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientViewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces(id, name), role")
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.workspace) redirect("/onboarding");
  const workspace = membership.workspace as unknown as {
    id: string;
    name: string;
  };

  // Role guard — only clients land here; everyone else goes to /dashboard
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspace.id)
    .single();

  const isOwner = ws?.owner_id === user.id;
  const memberRole = (membership.role as string)?.toLowerCase();
  const userRole = isOwner ? "owner" : memberRole || "member";
  if (userRole !== "client") redirect("/dashboard");

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [
    { data: projectsData },
    { data: teamSliceData },
    { count: teamTotal },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, ai_status, ai_data, created_at")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("team_members")
      .select("id, full_name, avatar_url")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .limit(8),
    supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null),
  ]);

  const projects: ProjectRaw[] = (projectsData || []).map((p) => ({
    ...p,
    ai_data: p.ai_data as ProjectRaw["ai_data"],
  }));
  const members: TeamMemberSlim[] = teamSliceData || [];
  const headcount = teamTotal ?? 0;

  // ── Milestone aggregation ─────────────────────────────────────────────────
  interface MilestoneRow {
    title: string;
    week: number;
    projectId: string;
    projectName: string;
    status: string;
  }
  const allMilestones: MilestoneRow[] = [];
  projects.forEach((p) => {
    (p.ai_data?.milestones || []).forEach((m) => {
      allMilestones.push({
        title: m.title,
        week: m.week,
        projectId: p.id,
        projectName: p.name,
        status: m.status || "pending",
      });
    });
  });
  allMilestones.sort((a, b) => a.week - b.week);

  const doneMilestones = allMilestones.filter(
    (m) => m.status === "completed",
  ).length;
  const totalMilestones = allMilestones.length;
  const milestonePct =
    totalMilestones > 0
      ? Math.round((doneMilestones / totalMilestones) * 100)
      : 0;
  const activeProjects = projects.filter(
    (p) => p.status === "active" || (!p.status && p.ai_status === "completed"),
  ).length;

  // Upcoming milestones grouped by week (max 8 weeks, 20 milestones)
  const upcoming = allMilestones
    .filter((m) => m.status !== "completed")
    .slice(0, 20);
  const byWeek = upcoming.reduce<Record<number, MilestoneRow[]>>((acc, m) => {
    (acc[m.week] ??= []).push(m);
    return acc;
  }, {});
  const weekGroups = Object.entries(byWeek)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(0, 8);

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {workspace.name}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5 font-medium">
          Your project portfolio overview
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Projects — gradient hero */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
          }}
        >
          <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-200 block mb-4">
            Projects
          </span>
          <div className="text-5xl font-black leading-none mb-3">
            {projects.length}
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-violet-100">
              {activeProjects} active
            </span>
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-200">
              {projects.length - activeProjects} planning
            </span>
          </div>
        </div>

        {/* Milestones */}
        <div className="rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-4">
            Milestones
          </span>
          <div className="text-5xl font-black text-slate-900 leading-none mb-3">
            {doneMilestones}
          </div>
          <div className="text-xs text-slate-400 font-medium mb-3">
            {doneMilestones} of {totalMilestones} completed
          </div>
          {totalMilestones > 0 && (
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full transition-all duration-700"
                style={{ width: `${milestonePct}%` }}
              />
            </div>
          )}
        </div>

        {/* Team */}
        <div className="rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-4">
            Team
          </span>
          <div className="text-5xl font-black text-slate-900 leading-none mb-3">
            {headcount}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            people on your workspace
          </div>
        </div>
      </div>

      {/* Project Portfolio */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Project Portfolio
          </h2>
          <span className="text-xs text-slate-400">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => {
              const pMilestones = p.ai_data?.milestones || [];
              const pDone = pMilestones.filter(
                (m) => m.status === "completed",
              ).length;
              const pTotal = pMilestones.length;
              const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

              const rawStatus = (p.status ??
                (p.ai_status === "completed"
                  ? "active"
                  : "pending")) as StatusKey;
              const cfg = STATUS_CFG[rawStatus] ?? STATUS_CFG.pending;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 border border-[#E8ECF4] shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-3.5 h-3.5 rounded-sm bg-indigo-500 transform rotate-45" />
                    </div>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1">
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(p.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>

                  {pTotal > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {pDone}/{pTotal} milestones
                        </span>
                        <span className="text-[11px] font-bold text-indigo-600">
                          {pPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${pPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-300 italic">
                      No milestones planned yet
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 border border-[#E8ECF4] text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderKanban size={26} className="text-indigo-200" />
            </div>
            <p className="text-sm font-semibold text-slate-400">
              No projects yet
            </p>
          </div>
        )}
      </div>

      {/* Milestone Timeline */}
      {weekGroups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Upcoming Milestones
            </h2>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold border border-indigo-100 uppercase tracking-wider">
              AI Planned
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {weekGroups.map(([week, milestones]) => (
                <div
                  key={week}
                  className="flex hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-20 flex-shrink-0 flex items-start justify-center pt-4 pl-4 pb-4">
                    <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg border border-indigo-100 min-w-[42px] text-center">
                      W{week}
                    </div>
                  </div>
                  <div className="flex-1 py-3 pr-4 space-y-2.5">
                    {milestones.map((m, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 mt-0.5">
                          {m.status === "completed" ? (
                            <CheckCircle2
                              size={14}
                              className="text-emerald-500"
                            />
                          ) : (
                            <Circle size={14} className="text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-tight">
                            {m.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {m.projectName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team headcount */}
      <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Team</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {headcount} people working on your workspace
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) =>
                m.avatar_url ? (
                  <img
                    key={m.id}
                    src={m.avatar_url}
                    alt={m.full_name}
                    className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover"
                  />
                ) : (
                  <div
                    key={m.id}
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(m.full_name)} border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-bold`}
                  >
                    {getInitials(m.full_name)}
                  </div>
                ),
              )}
              {headcount > 6 && (
                <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 text-[10px] font-bold">
                  +{headcount - 6}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 leading-none">
                {headcount}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                members
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
