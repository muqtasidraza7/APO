import { createClient } from "../../../../../utils/supabase/server";
import { createAdminClient } from "../../../../../utils/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Clock, Zap, MapPin,
  AlertTriangle, ArrowRight, Circle, Flag, Users,
  TrendingUp, TrendingDown, Layers, MessageSquare,
  Minus, BarChart2, ShieldAlert, GanttChart,
} from "lucide-react";

// ── Palette & helpers ──────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  "#6366f1", "#7c3aed", "#059669", "#dc2626",
  "#d97706", "#0284c7", "#db2777", "#0d9488",
  "#ea580c", "#4f46e5",
];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  return (name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── HealthRing SVG ─────────────────────────────────────────────────────────────

function HealthRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#6366f1" : pct > 0 ? "#f59e0b" : "#cbd5e1";

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
          />
        )}
      </svg>
      <span className="text-[9px] font-black relative z-10" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Avatar components ──────────────────────────────────────────────────────────

function Avatar({ member, size = "md" }: { member: any; size?: "sm" | "md" | "lg" }) {
  const color = avatarColor(member.id);
  const sz =
    size === "sm" ? "w-6 h-6 text-[9px] ring-1" :
    size === "lg" ? "w-10 h-10 text-sm ring-2" :
    "w-8 h-8 text-[11px] ring-2";
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold text-white ring-white flex-shrink-0 transition-transform hover:scale-110 hover:z-10`}
      style={{ backgroundColor: color }}
      title={member.full_name}
    >
      {initials(member.full_name)}
    </div>
  );
}

function AvatarRow({ members, max = 5, size = "md" }: { members: any[]; max?: number; size?: "sm" | "md" | "lg" }) {
  if (!members.length) return null;
  const shown = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 relative">
        {shown.map((m) => <Avatar key={m.id} member={m} size={size} />)}
        {extra > 0 && (
          <div className={`${size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[10px]"} rounded-full bg-slate-100 border-2 border-white flex items-center justify-center font-bold text-slate-500 ring-2 ring-white`}>
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sprint card (enhanced) ─────────────────────────────────────────────────────

interface SprintCardProps {
  sprint: any;
  stats: { total: number; done: number };
  members: any[];
  memberStats: Record<string, { done: number; total: number }>;
  priority: { high: number; medium: number; low: number };
}

function SprintCard({ sprint, stats, members, memberStats, priority }: SprintCardProps) {
  const today = new Date();
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);

  const st: "done" | "live" | "future" =
    sprint.status === "closed" || end < today ? "done" :
    start <= today ? "live" : "future";

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const isManual = !sprint.milestone_ids?.length;

  // Momentum for live sprints
  let momentum: "ahead" | "on-track" | "behind" | null = null;
  if (st === "live" && stats.total > 0) {
    const duration = end.getTime() - start.getTime();
    const elapsed = Math.min(duration, today.getTime() - start.getTime());
    const timeRate = Math.round((elapsed / duration) * 100);
    const gap = pct - timeRate;
    momentum = gap > 10 ? "ahead" : gap < -15 ? "behind" : "on-track";
  }

  const accent = {
    done:   { bar: "bg-emerald-400", prog: "bg-emerald-400", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={11} />, label: "Done" },
    live:   { bar: "bg-indigo-500",  prog: "bg-gradient-to-r from-indigo-500 to-violet-500", dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200",   icon: <Zap size={11} />,          label: "Live"  },
    future: { bar: "bg-slate-200",   prog: "bg-slate-300",   dot: "bg-slate-300",  badge: "bg-slate-50 text-slate-500 border-slate-200",     icon: <Clock size={11} />,         label: "Soon"  },
  }[st];

  const momentumMap = {
    ahead:      { icon: <TrendingUp size={10} />,    label: "Ahead",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    "on-track": { icon: <Minus size={10} />,          label: "On Track", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    behind:     { icon: <TrendingDown size={10} />,   label: "Behind",   cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const momentumCfg = momentum ? momentumMap[momentum] : null;

  const hasPriority = priority.high + priority.medium + priority.low > 0;

  const sortedContribs = members
    .map(m => ({ ...m, done: memberStats[m.id]?.done ?? 0, total: memberStats[m.id]?.total ?? 0 }))
    .sort((a, b) => b.done - a.done)
    .slice(0, 5);

  return (
    <div className="relative group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent.bar}`} />

      <div className="pl-4 pr-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0 mt-1.5">
            <div className={`w-2 h-2 rounded-full ${accent.dot}`} />
            {st === "live" && <div className={`absolute inset-0 w-2 h-2 rounded-full ${accent.dot} animate-ping opacity-70`} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-bold text-slate-900 text-sm truncate">{sprint.name}</span>
              {isManual && (
                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md tracking-wide">INDEPENDENT</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">{fmtDate(sprint.start_date)} → {fmtDate(sprint.end_date)}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {momentumCfg && (
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${momentumCfg.cls}`}>
                {momentumCfg.icon} {momentumCfg.label}
              </span>
            )}
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${accent.badge}`}>
              {accent.icon} {accent.label}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${accent.prog}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{stats.done}/{stats.total} · {pct}%</span>
        </div>

        {/* Priority chips */}
        {hasPriority && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {priority.high > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                <AlertTriangle size={8} /> {priority.high} High
              </span>
            )}
            {priority.medium > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                <Minus size={8} /> {priority.medium} Med
              </span>
            )}
            {priority.low > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                <Circle size={7} /> {priority.low} Low
              </span>
            )}
          </div>
        )}

        {/* Contributor leaderboard */}
        {sortedContribs.length > 0 && (
          <div className="border-t border-slate-50 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={10} className="text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contributors</span>
            </div>
            <div className="space-y-1.5">
              {sortedContribs.map((m) => {
                const barPct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
                const col = avatarColor(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0"
                      style={{ backgroundColor: col }}
                      title={m.full_name}
                    >
                      {initials(m.full_name)}
                    </div>
                    <span className="text-[9px] text-slate-600 truncate w-20 flex-shrink-0">{m.full_name}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: col }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{m.done}/{m.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sprint Debrief */}
        {sprint.retrospective_notes && (
          <div className="mt-3 bg-slate-900 rounded-xl p-3 border border-slate-700/80">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare size={10} className="text-indigo-400" />
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Sprint Debrief</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed italic">"{sprint.retrospective_notes}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Milestone status helpers ───────────────────────────────────────────────────

type MSStatus = "completed" | "live" | "upcoming" | "blocked";

function getMsStatus(ms: any, currentWeek: number): MSStatus {
  if (ms.status === "completed") return "completed";
  if (ms.status === "blocked") return "blocked";
  if ((ms.week || 0) <= currentWeek) return "live";
  return "upcoming";
}

const MS_DOT = {
  completed: { outer: "bg-emerald-500 shadow-emerald-200 shadow-lg", icon: <CheckCircle2 size={16} className="text-white" /> },
  live:      { outer: "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-300 shadow-lg", icon: <Zap size={16} className="text-white" /> },
  upcoming:  { outer: "bg-white border-2 border-slate-300 shadow-sm", icon: <Circle size={14} className="text-slate-400" /> },
  blocked:   { outer: "bg-red-500 shadow-red-200 shadow-lg", icon: <AlertTriangle size={14} className="text-white" /> },
};

const MS_BADGE = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  live:      "bg-indigo-100 text-indigo-700 border-indigo-200",
  upcoming:  "bg-slate-100 text-slate-600 border-slate-200",
  blocked:   "bg-red-100 text-red-700 border-red-200",
};

const MS_LABEL = { completed: "Completed", live: "In Progress", upcoming: "Upcoming", blocked: "Blocked" };

// ── Main page ──────────────────────────────────────────────────────────────────

export default async function RoadmapPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("name, workspace_id, ai_data, created_at")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  const workspaceId = project.workspace_id;
  const today = new Date();

  const [{ data: sprints }, { data: allTasks }, { data: teamMembers }] = await Promise.all([
    supabase.from("sprints")
      .select("id, name, start_date, end_date, status, milestone_ids, retrospective_notes")
      .eq("project_id", id)
      .order("start_date"),
    admin.from("sprint_tasks")
      .select("sprint_id, assigned_to, status, priority")
      .eq("project_id", id),
    admin.from("team_members")
      .select("id, full_name, job_title")
      .eq("workspace_id", workspaceId),
  ]);

  // Build member lookup
  const memberMap: Record<string, any> = {};
  for (const m of teamMembers || []) memberMap[m.id] = m;

  // Build sprint stats, member stats, and priority stats in one pass
  const sprintStats: Record<string, { total: number; done: number; memberIds: Set<string> }> = {};
  const sprintMemberStats: Record<string, Record<string, { done: number; total: number }>> = {};
  const sprintPriority: Record<string, { high: number; medium: number; low: number }> = {};
  const teamContrib: Record<string, { done: number; total: number }> = {};

  for (const t of allTasks || []) {
    const sid = t.sprint_id;

    // Base stats
    if (!sprintStats[sid]) sprintStats[sid] = { total: 0, done: 0, memberIds: new Set() };
    sprintStats[sid].total++;
    if (t.status === "done") sprintStats[sid].done++;
    if (t.assigned_to) sprintStats[sid].memberIds.add(t.assigned_to);

    // Per-member stats
    if (t.assigned_to) {
      if (!sprintMemberStats[sid]) sprintMemberStats[sid] = {};
      if (!sprintMemberStats[sid][t.assigned_to]) sprintMemberStats[sid][t.assigned_to] = { done: 0, total: 0 };
      sprintMemberStats[sid][t.assigned_to].total++;
      if (t.status === "done") sprintMemberStats[sid][t.assigned_to].done++;

      // Team-wide contribution
      if (!teamContrib[t.assigned_to]) teamContrib[t.assigned_to] = { done: 0, total: 0 };
      teamContrib[t.assigned_to].total++;
      if (t.status === "done") teamContrib[t.assigned_to].done++;
    }

    // Priority breakdown
    if (!sprintPriority[sid]) sprintPriority[sid] = { high: 0, medium: 0, low: 0 };
    const p = (t.priority || "").toLowerCase();
    if (p === "high") sprintPriority[sid].high++;
    else if (p === "medium" || p === "med") sprintPriority[sid].medium++;
    else if (p === "low") sprintPriority[sid].low++;
  }

  // Milestones from ai_data
  const rawMilestones: any[] = project.ai_data?.milestones || [];
  const totalWeeks: number = project.ai_data?.timeline_weeks || 12;
  const projectStart = new Date(project.created_at);
  const daysSince = (today.getTime() - projectStart.getTime()) / 864e5;
  const currentWeek = Math.max(1, Math.min(totalWeeks, Math.ceil(daysSince / 7)));

  // De-dupe milestones by title, sort by week
  const seenMs = new Set<string>();
  const milestones = rawMilestones
    .filter((ms: any) => { if (!ms.title || seenMs.has(ms.title)) return false; seenMs.add(ms.title); return true; })
    .sort((a: any, b: any) => (a.week || 0) - (b.week || 0));

  function sprintsForMs(msTitle: string) {
    return (sprints || []).filter((s) =>
      (s.milestone_ids || []).some((mid: string) =>
        mid.trim().toLowerCase() === msTitle.trim().toLowerCase()
      )
    );
  }

  const manualSprints = (sprints || []).filter(
    (s) => !s.milestone_ids || s.milestone_ids.length === 0
  );

  // Active sprints right now
  const activeSprints = (sprints || []).filter((s) => {
    const st = new Date(s.start_date).getTime();
    const en = new Date(s.end_date).getTime();
    return st <= today.getTime() && en >= today.getTime() && s.status !== "closed";
  });

  // Active contributors across current sprints (for today marker)
  const activeContribMap: Record<string, { member: any; done: number; total: number }> = {};
  for (const s of activeSprints) {
    const ms = sprintMemberStats[s.id] || {};
    for (const [memberId, mStats] of Object.entries(ms)) {
      const member = memberMap[memberId];
      if (!member) continue;
      if (!activeContribMap[memberId]) activeContribMap[memberId] = { member, done: 0, total: 0 };
      activeContribMap[memberId].done += mStats.done;
      activeContribMap[memberId].total += mStats.total;
    }
  }
  const activeContribs = Object.entries(activeContribMap)
    .map(([id, c]) => ({ id, ...c }))
    .sort((a, b) => b.done - a.done)
    .slice(0, 6);

  // Top contributors overall (for hero strip)
  const topContribs = Object.entries(teamContrib)
    .map(([id, stats]) => ({ id, ...stats, member: memberMap[id] }))
    .filter((c) => c.member)
    .sort((a, b) => b.done - a.done)
    .slice(0, 8);

  // Build timeline entries
  type Entry =
    | { kind: "milestone"; ms: any; sprints: any[]; idx: number }
    | { kind: "today" };

  const entries: Entry[] = [];
  let todayDone = false;

  for (let i = 0; i < milestones.length; i++) {
    const ms = milestones[i];
    if (!todayDone && currentWeek < (ms.week || 0)) {
      entries.push({ kind: "today" });
      todayDone = true;
    }
    entries.push({ kind: "milestone", ms, sprints: sprintsForMs(ms.title), idx: i });
  }
  if (!todayDone) entries.push({ kind: "today" });

  // Overall progress
  const totalTasks = Object.values(sprintStats).reduce((s, v) => s + v.total, 0);
  const doneTasks = Object.values(sprintStats).reduce((s, v) => s + v.done, 0);
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const completedMs = milestones.filter((ms: any) => ms.status === "completed").length;

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-0">

      {/* Back */}
      <div className="pb-4">
        <Link href={`/dashboard/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors">
          <ArrowLeft size={14} /> Back to Project
        </Link>
      </div>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 mb-8">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-violet-500/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative p-8">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center">
                  <Layers size={18} className="text-white" />
                </div>
                <span className="text-white/50 text-[10px] font-bold tracking-[4px] uppercase">Mission Timeline</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1">{project.name}</h1>
              <p className="text-white/40 text-sm">
                Week {currentWeek} of {totalWeeks} · {milestones.length} milestones · {(sprints || []).length} sprints
                {activeSprints.length > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-indigo-300">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse inline-block" />
                    {activeSprints.length} active now
                  </span>
                )}
              </p>
            </div>

            {/* Stats cluster */}
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <div className="bg-white/8 border border-white/10 rounded-2xl px-5 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-black text-white">{overallPct}%</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Complete</div>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-2xl px-5 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-black text-white">{completedMs}/{milestones.length}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Milestones</div>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-2xl px-5 py-3 text-center min-w-[80px]">
                <div className="text-2xl font-black text-white">{doneTasks}/{totalTasks}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Tasks</div>
              </div>
            </div>
          </div>

          {/* Team pulse strip */}
          {topContribs.length > 0 && (
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold whitespace-nowrap flex-shrink-0">Top Contributors</span>
              <div className="flex items-center gap-3 overflow-x-auto">
                {topContribs.map((c) => {
                  const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
                  return (
                    <div key={c.id} className="flex flex-col items-center gap-1 flex-shrink-0 group/contrib">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black border-2 border-white/20 transition-transform group-hover/contrib:scale-110"
                        style={{ backgroundColor: avatarColor(c.id) }}
                        title={c.member.full_name}
                      >
                        {initials(c.member.full_name)}
                      </div>
                      <div className="text-[8px] font-bold text-white/40">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week progress track */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Timeline Progress</span>
              <span className="text-[10px] text-white/40">Week {currentWeek} of {totalWeeks}</span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                style={{ width: `${Math.min(100, (currentWeek / totalWeeks) * 100)}%` }}
              />
            </div>
            <div className="flex mt-1.5 relative" style={{ gap: 0 }}>
              {Array.from({ length: totalWeeks }, (_, i) => {
                const w = i + 1;
                const isCur = w === currentWeek;
                const isPast = w < currentWeek;
                const hasMilestone = milestones.some((ms: any) => ms.week === w);
                return (
                  <div key={w} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    {hasMilestone && (
                      <div className={`w-1 h-1 rounded-full ${isPast || isCur ? "bg-violet-400" : "bg-white/20"}`} />
                    )}
                    {isCur && <div className="text-[8px] font-black text-indigo-300 whitespace-nowrap">W{w}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────────────────── */}
      {milestones.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Flag size={28} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">No Milestones Yet</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">Run AI Analysis on your project to generate a milestone plan, then come back here.</p>
          <Link href={`/dashboard/projects/${id}`} className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
            Go to Project <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[52px] top-6 bottom-6 w-px bg-gradient-to-b from-indigo-300 via-slate-200 to-slate-100 pointer-events-none" />

          <div className="space-y-0">
            {entries.map((entry, ei) => {

              // ── Today marker ──────────────────────────────────────────────
              if (entry.kind === "today") {
                return (
                  <div key="today" className="flex items-start gap-0 py-5">
                    <div className="w-[104px] flex-shrink-0 flex flex-col items-center pt-0.5">
                      <div className="relative z-10">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-300">
                          <MapPin size={14} className="text-white" />
                        </div>
                        <div className="absolute inset-0 w-8 h-8 bg-indigo-400 rounded-full animate-ping opacity-40" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-indigo-400/60 to-transparent" />
                        <div className="flex items-center gap-2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-md shadow-indigo-300/40 flex-shrink-0 uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          Week {currentWeek} · Today
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-indigo-400/60 to-transparent" />
                      </div>

                      {activeSprints.length > 0 && activeContribs.length > 0 && (
                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-200/80 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
                              <Zap size={11} className="text-white" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                              {activeSprints.length} Sprint{activeSprints.length !== 1 ? "s" : ""} In Progress
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeContribs.map((c) => {
                              const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
                              return (
                                <div key={c.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-indigo-100 shadow-sm">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                                    style={{ backgroundColor: avatarColor(c.id) }}
                                  >
                                    {initials(c.member.full_name)}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-900 leading-none">{c.member.full_name.split(" ")[0]}</p>
                                    <p className="text-[9px] text-slate-500 mt-0.5">{c.done}/{c.total} · {pct}%</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // ── Milestone entry ───────────────────────────────────────────
              const { ms, sprints: linkedSprints, idx } = entry;
              const msStatus = getMsStatus(ms, currentWeek);
              const dot = MS_DOT[msStatus];
              const assignedMembers = (ms.assigned_member_ids || []).map((mid: string) => memberMap[mid]).filter(Boolean);

              // Health ring: aggregate linked sprint tasks
              const msSprintData = linkedSprints.map((s) => sprintStats[s.id] || { total: 0, done: 0 });
              const msTotalTasks = msSprintData.reduce((sum, s) => sum + s.total, 0);
              const msDoneTasks = msSprintData.reduce((sum, s) => sum + s.done, 0);
              const msHealthPct = msTotalTasks > 0 ? Math.round((msDoneTasks / msTotalTasks) * 100) : 0;

              // Countdown chip
              const msWeek = ms.week || 0;
              const weeksUntil = msWeek - currentWeek;
              const countdown =
                msStatus === "completed" ? null :
                msStatus === "blocked" ? null :
                weeksUntil <= 0 ? "Due now" :
                weeksUntil === 1 ? "1 wk left" :
                `${weeksUntil} wks left`;

              // Risk flag
              const msRisk =
                msStatus === "blocked" ? "critical" :
                msStatus === "live" && linkedSprints.length === 0 ? "high" :
                msStatus === "upcoming" && weeksUntil > 0 && weeksUntil <= 2 && msTotalTasks > 0 && msHealthPct < 50 ? "warning" :
                null;

              return (
                <div key={ms.title + idx} className="flex gap-0 pb-10 last:pb-0">
                  {/* Left: week label + dot + health ring */}
                  <div className="w-[104px] flex-shrink-0 flex flex-col items-center pt-1 gap-1.5">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Wk {ms.week}
                    </div>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 relative ${dot.outer}`}>
                      {dot.icon}
                    </div>
                    {msTotalTasks > 0 && (
                      <HealthRing pct={msHealthPct} size={40} />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className="flex-1 min-w-0 pt-1">
                    {/* Milestone header card */}
                    <div className={`rounded-2xl border p-5 mb-3 ${
                      msStatus === "live" ? "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200" :
                      msStatus === "completed" ? "bg-emerald-50/60 border-emerald-200" :
                      msStatus === "blocked" ? "bg-red-50/60 border-red-200" :
                      "bg-white border-slate-200"
                    }`}>
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Milestone {idx + 1}/{milestones.length}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${MS_BADGE[msStatus]}`}>
                              {MS_LABEL[msStatus]}
                            </span>
                            {countdown && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                weeksUntil <= 1 ? "bg-rose-50 text-rose-700 border-rose-200" :
                                weeksUntil <= 3 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-violet-50 text-violet-700 border-violet-200"
                              }`}>
                                {countdown}
                              </span>
                            )}
                            {msRisk === "critical" && (
                              <span className="flex items-center gap-1 text-[10px] font-black bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={9} /> Critical
                              </span>
                            )}
                            {msRisk === "high" && (
                              <span className="flex items-center gap-1 text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={9} /> No Sprints
                              </span>
                            )}
                            {msRisk === "warning" && (
                              <span className="flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={9} /> At Risk
                              </span>
                            )}
                          </div>
                          <h2 className={`text-lg font-black tracking-tight ${
                            msStatus === "live" ? "text-indigo-900" :
                            msStatus === "completed" ? "text-emerald-900" :
                            msStatus === "blocked" ? "text-red-900" :
                            "text-slate-900"
                          }`}>
                            {ms.title}
                          </h2>
                          {ms.deliverable && (
                            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{ms.deliverable}</p>
                          )}
                        </div>

                        {/* Team leads — names visible */}
                        {assignedMembers.length > 0 && (
                          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                            <div className="flex -space-x-2">
                              {assignedMembers.slice(0, 4).map((m: any) => (
                                <Avatar key={m.id} member={m} size="md" />
                              ))}
                              {assignedMembers.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 ring-2 ring-white">
                                  +{assignedMembers.length - 4}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              {assignedMembers.slice(0, 2).map((m: any) => (
                                <span key={m.id} className="text-[9px] font-medium text-slate-500">{m.full_name}</span>
                              ))}
                              {assignedMembers.length > 2 && (
                                <span className="text-[9px] text-slate-400">+{assignedMembers.length - 2} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Milestone completion summary if has sprint data */}
                      {msTotalTasks > 0 && (
                        <div className="flex items-center gap-3 pt-3 border-t border-black/5">
                          <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                msHealthPct >= 80 ? "bg-emerald-500" :
                                msHealthPct >= 50 ? "bg-indigo-500" :
                                msHealthPct > 0 ? "bg-amber-500" : "bg-slate-200"
                              }`}
                              style={{ width: `${msHealthPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                            {msDoneTasks}/{msTotalTasks} tasks · {msHealthPct}% done
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Linked sprints */}
                    {linkedSprints.length > 0 && (
                      <div className="space-y-2 pl-3 border-l-2 border-dashed border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={11} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {linkedSprints.length} sprint{linkedSprints.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {linkedSprints.map((sprint: any) => {
                          const stats = sprintStats[sprint.id] || { total: 0, done: 0, memberIds: new Set() };
                          const mems = Array.from(stats.memberIds).map((mid: string) => memberMap[mid]).filter(Boolean);
                          return (
                            <SprintCard
                              key={sprint.id}
                              sprint={sprint}
                              stats={{ total: stats.total, done: stats.done }}
                              members={mems}
                              memberStats={sprintMemberStats[sprint.id] || {}}
                              priority={sprintPriority[sprint.id] || { high: 0, medium: 0, low: 0 }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {linkedSprints.length === 0 && (
                      <div className="pl-3 border-l-2 border-dashed border-slate-100">
                        <p className="text-[11px] text-slate-400 italic py-2">No sprints linked yet — create a sprint and associate it with this milestone.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Independent Sprints ─────────────────────────────────────────────── */}
      {manualSprints.length > 0 && (
        <div className="mt-10 pt-8 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
              <Layers size={15} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Independent Sprints</h3>
              <p className="text-[10px] text-slate-400">Not linked to any milestone</p>
            </div>
            <span className="ml-auto text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              {manualSprints.length} sprint{manualSprints.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {manualSprints.map((sprint: any) => {
              const stats = sprintStats[sprint.id] || { total: 0, done: 0, memberIds: new Set() };
              const mems = Array.from(stats.memberIds).map((mid: string) => memberMap[mid]).filter(Boolean);
              return (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  stats={{ total: stats.total, done: stats.done }}
                  members={mems}
                  memberStats={sprintMemberStats[sprint.id] || {}}
                  priority={sprintPriority[sprint.id] || { high: 0, medium: 0, low: 0 }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="flex flex-wrap gap-3 mt-10 pt-6 border-t border-slate-100">
        <Link
          href={`/dashboard/projects/${id}/gantt`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
        >
          <GanttChart size={13} /> Gantt Chart
        </Link>
        <Link
          href={`/dashboard/projects/${id}/sprints`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
        >
          <Zap size={13} /> Manage Sprints
        </Link>
        <Link
          href={`/dashboard/projects/${id}/risk-radar`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
        >
          <ShieldAlert size={13} /> AI Risk Radar
        </Link>
        <Link
          href={`/dashboard/projects/${id}/allocation`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
        >
          <Users size={13} /> Team Allocation
        </Link>
        <Link
          href={`/dashboard/projects/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
        >
          <ArrowRight size={13} /> Project Blueprint
        </Link>
      </div>
    </div>
  );
}
