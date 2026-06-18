import { createClient } from "../../../../../utils/supabase/server";
import { createAdminClient } from "../../../../../utils/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft, Flame, AlertTriangle, ShieldAlert,
  CheckCircle2, Clock, Users, TrendingDown,
  ArrowRight, Zap, Activity, Shield,
} from "lucide-react";

type Severity = "critical" | "high" | "medium";
type IconType = "flame" | "trending-down" | "users" | "clock" | "shield-alert" | "activity";

interface Risk {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  details: string[];
  href?: string;
  icon: IconType;
}

const SEV = {
  critical: { label: "Critical", bar: "bg-red-500", iconBg: "bg-red-100", iconColor: "text-red-600", badge: "bg-red-100 text-red-700 border-red-200", section: "text-red-600", card: "border-red-100" },
  high: { label: "High", bar: "bg-orange-500", iconBg: "bg-orange-100", iconColor: "text-orange-600", badge: "bg-orange-100 text-orange-700 border-orange-200", section: "text-orange-600", card: "border-orange-100" },
  medium: { label: "Medium", bar: "bg-amber-400", iconBg: "bg-amber-100", iconColor: "text-amber-600", badge: "bg-amber-100 text-amber-700 border-amber-200", section: "text-amber-600", card: "border-amber-100" },
};

function RiskIcon({ type, className }: { type: IconType; className: string }) {
  if (type === "flame") return <Flame size={18} className={className} />;
  if (type === "trending-down") return <TrendingDown size={18} className={className} />;
  if (type === "users") return <Users size={18} className={className} />;
  if (type === "clock") return <Clock size={18} className={className} />;
  if (type === "shield-alert") return <ShieldAlert size={18} className={className} />;
  return <Activity size={18} className={className} />;
}

function RiskCard({ risk }: { risk: Risk }) {
  const s = SEV[risk.severity];
  return (
    <div className={`relative bg-white border ${s.card} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
      <div className="pl-5 pr-5 py-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <RiskIcon type={risk.icon} className={`${s.iconColor}${risk.severity === "critical" ? " animate-pulse" : ""}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
              <span className="text-[10px] text-slate-400 font-medium">{risk.category}</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-snug">{risk.title}</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{risk.description}</p>
            {risk.details.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {risk.details.map((d, i) => (
                  <span key={i} className="text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg font-medium">{d}</span>
                ))}
              </div>
            )}
          </div>
          {risk.href && (
            <Link href={risk.href} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold whitespace-nowrap flex-shrink-0 mt-0.5 transition-colors">
              View <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ severity, count }: { severity: Severity; count: number }) {
  const s = SEV[severity];
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-2 h-2 rounded-full ${s.bar}`} />
      <h2 className={`text-xs font-bold uppercase tracking-widest ${s.section}`}>{s.label}</h2>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>{count}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export default async function RiskRadarPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("name, workspace_id, ai_data, created_at").eq("id", id).single();
  if (!project) redirect("/dashboard");

  const workspaceId = project.workspace_id;
  const today = new Date();

  const [{ data: sprints }, { data: allSprintTasks }, { data: teamMembers }, { data: patterns }] = await Promise.all([
    supabase.from("sprints").select("id, name, start_date, end_date, status").eq("project_id", id),
    supabase.from("sprint_tasks").select("id, sprint_id, assigned_to, status, time_estimate_hours").eq("project_id", id),
    admin.from("team_members").select("id, full_name, capacity_hours_per_week").eq("workspace_id", workspaceId),
    admin.from("worker_patterns").select("pattern_type, member_id, member_id_a, member_id_b, reason, severity").eq("workspace_id", workspaceId).eq("resolved", false).in("pattern_type", ["group_conflict", "task_incompatibility"]),
  ]);

  const activeSprints = (sprints || []).filter(s => {
    const start = new Date(s.start_date), end = new Date(s.end_date);
    return start <= today && end >= today;
  });

  const memberMap: Record<string, any> = {};
  for (const m of (teamMembers || [])) memberMap[m.id] = m;

  const risks: Risk[] = [];

  for (const sprint of activeSprints) {
    const tasks = (allSprintTasks || []).filter(t => t.sprint_id === sprint.id);
    if (!tasks.length) continue;
    const start = new Date(sprint.start_date), end = new Date(sprint.end_date);
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 864e5);
    const timeElapsed = Math.min(100, ((today.getTime() - start.getTime()) / 864e5 / totalDays) * 100);
    const done = tasks.filter(t => t.status === "done").length;
    const completionRate = (done / tasks.length) * 100;
    const gap = timeElapsed - completionRate;
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 864e5);

    if (gap > 35) risks.push({ id: `burn-${sprint.id}`, severity: "critical", icon: "flame", category: "Sprint Burndown", title: `"${sprint.name}" is severely behind schedule`, description: `${Math.round(timeElapsed)}% time elapsed, only ${Math.round(completionRate)}% tasks done. Cannot deliver at this pace.`, details: [`${done}/${tasks.length} done`, `${Math.round(gap)}% behind`, `${daysLeft}d left`], href: `/dashboard/projects/${id}/sprints` });
    else if (gap > 20) risks.push({ id: `burn-${sprint.id}`, severity: "high", icon: "trending-down", category: "Sprint Burndown", title: `"${sprint.name}" is falling behind`, description: `${Math.round(timeElapsed)}% time elapsed with ${Math.round(completionRate)}% completion. Needs attention.`, details: [`${done}/${tasks.length} done`, `${Math.round(gap)}% gap`, `${daysLeft}d left`], href: `/dashboard/projects/${id}/sprints` });
    else if (gap > 10) risks.push({ id: `burn-${sprint.id}`, severity: "medium", icon: "clock", category: "Sprint Burndown", title: `"${sprint.name}" is slightly behind pace`, description: `${Math.round(gap)}% below ideal burndown. Monitor closely.`, details: [`${done}/${tasks.length} done`, `${Math.round(gap)}% gap`, `${daysLeft}d left`], href: `/dashboard/projects/${id}/sprints` });
  }

  const memberHours: Record<string, number> = {};
  for (const sprint of activeSprints) {
    for (const task of (allSprintTasks || []).filter(t => t.sprint_id === sprint.id && t.status !== "done")) {
      if (task.assigned_to) memberHours[task.assigned_to] = (memberHours[task.assigned_to] || 0) + (task.time_estimate_hours || 0);
    }
  }
  for (const [mid, hours] of Object.entries(memberHours)) {
    const m = memberMap[mid]; if (!m) continue;
    const cap = m.capacity_hours_per_week || 40;
    const ratio = Math.round((hours / cap) * 100);
    if (ratio > 120) risks.push({ id: `ov-${mid}`, severity: "critical", icon: "users", category: "Team Overload", title: `${m.full_name} is critically overloaded`, description: `${hours}h assigned vs ${cap}h/wk limit. Burnout and missed tasks are likely.`, details: [`${ratio}% capacity`, `${hours}h assigned`, `${cap}h/wk`], href: `/dashboard/team` });
    else if (ratio > 100) risks.push({ id: `ov-${mid}`, severity: "high", icon: "users", category: "Team Overload", title: `${m.full_name} exceeds weekly capacity`, description: `${hours}h of remaining tasks against ${cap}h/wk limit. Slippage expected.`, details: [`${ratio}% capacity`, `${hours}h / ${cap}h`], href: `/dashboard/team` });
    else if (ratio > 80) risks.push({ id: `ov-${mid}`, severity: "medium", icon: "users", category: "Team Capacity", title: `${m.full_name} at high utilization`, description: `${ratio}% of weekly capacity consumed. Additional tasks risk overload.`, details: [`${ratio}% utilized`, `${hours}h / ${cap}h`], href: `/dashboard/team` });
  }

  const activeMIds = new Set((allSprintTasks || []).filter(t => activeSprints.some(s => s.id === t.sprint_id) && t.assigned_to).map(t => t.assigned_to));
  const seen = new Set<string>();
  for (const p of (patterns || [])) {
    if (p.pattern_type === "group_conflict") {
      if (!activeMIds.has(p.member_id_a) || !activeMIds.has(p.member_id_b)) continue;
      const key = [p.member_id_a, p.member_id_b].sort().join("-");
      if (seen.has(key)) continue; seen.add(key);
      const nA = memberMap[p.member_id_a]?.full_name || "Unknown", nB = memberMap[p.member_id_b]?.full_name || "Unknown";
      risks.push({ id: `cf-${key}`, severity: p.severity === "blocker" ? "high" : "medium", icon: "shield-alert", category: "Behavioral Conflict", title: `${nA} & ${nB} have an unresolved conflict`, description: p.reason, details: ["Group Conflict", `Severity: ${p.severity}`, "Both active on sprint"], href: `/dashboard/team` });
    } else if (p.pattern_type === "task_incompatibility" && activeMIds.has(p.member_id)) {
      const name = memberMap[p.member_id]?.full_name || "Unknown";
      risks.push({ id: `inc-${p.member_id}`, severity: p.severity === "blocker" ? "high" : "medium", icon: "shield-alert", category: "Task Incompatibility", title: `${name} flagged for task incompatibility`, description: p.reason, details: [`Severity: ${p.severity}`], href: `/dashboard/team` });
    }
  }

  const milestones = project.ai_data?.milestones || [];
  const projectStart = new Date(project.created_at);
  const currentWeek = Math.max(1, Math.ceil((today.getTime() - projectStart.getTime()) / (7 * 864e5)));
  const msKeys = new Set<string>();
  for (const ms of milestones) {
    if (msKeys.has(ms.title)) continue; msKeys.add(ms.title);
    const weeksLeft = (ms.week || 0) - currentWeek;
    if (ms.status === "completed" || weeksLeft < 0 || weeksLeft > 3) continue;
    if (ms.status === "blocked") risks.push({ id: `msb-${ms.title}`, severity: "high", icon: "shield-alert", category: "Milestone Risk", title: `Milestone "${ms.title}" is blocked`, description: `Due Week ${ms.week}, currently blocked. Immediate resolution needed.`, details: [`Week ${ms.week}`, weeksLeft === 0 ? "This week" : `${weeksLeft}wk away`], href: `/dashboard/projects/${id}` });
    else if (weeksLeft <= 1) risks.push({ id: `msd-${ms.title}`, severity: "high", icon: "clock", category: "Milestone Deadline", title: `"${ms.title}" due ${weeksLeft === 0 ? "this week" : "next week"}`, description: `Due Week ${ms.week}, not yet complete. Verify sprint task progress urgently.`, details: [`Week ${ms.week}`, `Status: ${ms.status || "in progress"}`], href: `/dashboard/projects/${id}` });
    else risks.push({ id: `msd-${ms.title}`, severity: "medium", icon: "clock", category: "Milestone Deadline", title: `"${ms.title}" approaching deadline`, description: `Due in ${weeksLeft} weeks (Week ${ms.week}). Ensure tasks are progressing.`, details: [`Week ${ms.week}`, `${weeksLeft} weeks away`], href: `/dashboard/projects/${id}` });
  }

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
  risks.sort((a, b) => order[a.severity] - order[b.severity]);
  const criticals = risks.filter(r => r.severity === "critical");
  const highs = risks.filter(r => r.severity === "high");
  const mediums = risks.filter(r => r.severity === "medium");

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link href={`/dashboard/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors">
        <ArrowLeft size={14} /> Back to Project
      </Link>

      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                {risks.length > 0 && <div className="absolute inset-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-60" />}
              </div>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[3px]">{risks.length > 0 ? "Live Detection" : "All Clear"}</span>
            </div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center">
                <ShieldAlert size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-white">AI Risk Radar</h1>
            </div>
            <p className="text-slate-400 text-sm ml-[52px]">"{project.name}"</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {criticals.length > 0 && <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-2"><Flame size={13} className="text-red-400 animate-pulse" /><span className="text-red-300 font-bold text-sm">{criticals.length}</span><span className="text-red-400/70 text-xs">Critical</span></div>}
            {highs.length > 0 && <div className="flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-xl px-4 py-2"><AlertTriangle size={13} className="text-orange-400" /><span className="text-orange-300 font-bold text-sm">{highs.length}</span><span className="text-orange-400/70 text-xs">High</span></div>}
            {mediums.length > 0 && <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-4 py-2"><Zap size={13} className="text-amber-400" /><span className="text-amber-300 font-bold text-sm">{mediums.length}</span><span className="text-amber-400/70 text-xs">Medium</span></div>}
            {risks.length === 0 && <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-2"><CheckCircle2 size={13} className="text-emerald-400" /><span className="text-emerald-300 font-bold text-sm">0 Risks</span></div>}
          </div>
        </div>
      </div>

      {risks.length === 0 && (
        <div className="bg-white border border-emerald-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="relative inline-flex mb-6"><div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 size={40} className="text-emerald-600" /></div><div className="absolute inset-0 w-20 h-20 bg-emerald-200 rounded-full animate-ping opacity-30" /></div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">No Threats Detected</h2>
          <p className="text-slate-500 max-w-md mx-auto text-sm">All sprints on track, team capacity within limits, no active behavioral conflicts. AI will alert you the moment anything changes.</p>
          <div className="flex justify-center gap-4 mt-8">
            <Link href={`/dashboard/projects/${id}/sprints`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">View Sprints <ArrowRight size={14} /></Link>
            <Link href={`/dashboard/projects/${id}`} className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Back to Project</Link>
          </div>
        </div>
      )}

      {criticals.length > 0 && <section><SectionHeader severity="critical" count={criticals.length} /><div className="space-y-3">{criticals.map(r => <RiskCard key={r.id} risk={r} />)}</div></section>}
      {highs.length > 0 && <section><SectionHeader severity="high" count={highs.length} /><div className="space-y-3">{highs.map(r => <RiskCard key={r.id} risk={r} />)}</div></section>}
      {mediums.length > 0 && <section><SectionHeader severity="medium" count={mediums.length} /><div className="space-y-3">{mediums.map(r => <RiskCard key={r.id} risk={r} />)}</div></section>}

      {risks.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <Shield size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">Risk scores computed from live sprint burndown, team capacity, behavioral patterns, and milestone deadlines. Updates on every page load.</p>
        </div>
      )}
    </div>
  );
}
