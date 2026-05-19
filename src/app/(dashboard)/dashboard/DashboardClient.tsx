"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import {
  Calendar, Clock, Plus, CheckCircle2, Circle, ChevronDown, Loader2,
  Users, FolderKanban, Zap, Target, BarChart2, ArrowUpRight,
  AlertTriangle, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProjectStatus } from "./projects/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  status?: string;
  ai_status?: string;
  created_at: string;
}

interface Sprint {
  id: string;
  name: string;
  status?: string;
  start_date: string;
  end_date: string;
  project_id: string;
}

interface SprintTask {
  id: string;
  title: string;
  status: string;
  sprint_id: string;
  project_id?: string;
  assigned_to?: string;
  created_at: string;
}

interface TeamMemberRaw {
  id: string;
  user_id: string;
  full_name: string;
  job_title?: string;
  status: string;
  avatar_url?: string;
  performance_score?: number | null;
}

interface ActivityItem {
  id: string;
  description: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, unknown>;
  team_member_id: string;
}

interface AIMilestone {
  id: string;
  task_name: string;
  week_number: number;
  project_id: string;
  project: { name: string };
}

interface DashboardStats {
  totalProjects: number;
  endedProjects: number;
  runningProjects: number;
  pendingProjects: number;
  activeSprintsCount: number;
  teamMembersCount: number;
  completionRate: number;
}

interface DashboardClientProps {
  stats: DashboardStats;
  projects: Project[];
  activities: ActivityItem[];
  workspace: { id: string; name: string; created_at: string };
  sprints: Sprint[];
  sprintTasks: SprintTask[];
  teamMembers: TeamMemberRaw[];
  recentActivity: ActivityItem[];
  aiMilestones: AIMilestone[];
  userRole: string;
  currentMember?: { id: string; full_name: string; avatar_url?: string; job_title?: string } | null;
  userId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-indigo-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-500",
  "from-purple-400 to-fuchsia-500",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function scoreConfig(score: number) {
  if (score >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-200" };
  if (score >= 60) return { bar: "bg-amber-400",   text: "text-amber-600",   ring: "ring-amber-200"   };
  return              { bar: "bg-red-400",    text: "text-red-500",    ring: "ring-red-200"    };
}

const STATUS_CFG: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  completed: { bg: "bg-emerald-50 hover:bg-emerald-100", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", label: "Ended"   },
  pending:   { bg: "bg-amber-50 hover:bg-amber-100",     border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Pending" },
  active:    { bg: "bg-indigo-50 hover:bg-indigo-100",   border: "border-indigo-200",  text: "text-indigo-700",  dot: "bg-indigo-500",  label: "Running" },
};

// ── Project Row ───────────────────────────────────────────────────────────────

interface ProjectRowProps {
  p: Project;
  handleStatusChange: (id: string, status: string) => void;
  updatingProjectId: string | null;
}

const ProjectRow = ({ p, handleStatusChange, updatingProjectId }: ProjectRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentStatus = p.status || (p.ai_status === "completed" ? "active" : "pending");
  const active = STATUS_CFG[currentStatus] ?? STATUS_CFG.active;
  const isUpdating = updatingProjectId === p.id;

  return (
    <div className="flex items-center gap-3 bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm p-3 rounded-xl transition-all group">
      <Link
        href={`/dashboard/projects/${p.id}`}
        className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-200 flex items-center justify-center flex-shrink-0 transition-colors"
      >
        <div className="w-3.5 h-3.5 rounded-sm bg-indigo-500 transform rotate-45 group-hover:rotate-90 transition-transform duration-300" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/dashboard/projects/${p.id}`} className="block">
          <h4 className="text-slate-900 font-semibold text-sm truncate group-hover:text-indigo-700 transition-colors leading-tight">
            {p.name}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Calendar size={10} />
            {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </Link>
      </div>

      <div className="relative flex-shrink-0" ref={dropdownRef}>
        {isUpdating ? (
          <div className="px-3 py-1 flex items-center justify-center">
            <Loader2 size={13} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${active.bg} ${active.border} ${active.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active.dot}`} />
            {active.label}
            <ChevronDown size={11} className={`opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        )}
        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden">
            {Object.entries(STATUS_CFG).map(([val, cfg]) => (
              <button
                key={val}
                onClick={() => { setIsOpen(false); if (val !== currentStatus) handleStatusChange(p.id, val); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${currentStatus === val ? "bg-slate-50" : ""}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className="text-slate-700">{cfg.label}</span>
                {currentStatus === val && <CheckCircle2 size={11} className="ml-auto text-indigo-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Chart Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { fullDate: string; activity: number; tasks: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-2xl border border-slate-700/50 text-xs">
      <p className="font-bold text-slate-200 mb-2">{d.fullDate}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-slate-400">Activity</span>
          <span className="text-white font-bold ml-auto pl-4">{d.activity}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Tasks</span>
          <span className="text-white font-bold ml-auto pl-4">{d.tasks}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

// ── Sprint health config ───────────────────────────────────────────────────────

const HEALTH_CFG = {
  on_track: {
    dot:    "bg-emerald-500",
    bar:    "bg-emerald-500",
    border: "border-slate-100 hover:border-emerald-200",
    badge:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    label:  "On Track",
    Icon:   CheckCircle2,
    iconCls: "text-emerald-500",
  },
  at_risk: {
    dot:    "bg-amber-400",
    bar:    "bg-amber-400",
    border: "border-amber-100 hover:border-amber-200",
    badge:  "bg-amber-50 text-amber-700 border-amber-200",
    label:  "At Risk",
    Icon:   AlertTriangle,
    iconCls: "text-amber-500",
  },
  overdue: {
    dot:    "bg-red-500",
    bar:    "bg-red-400",
    border: "border-red-100 hover:border-red-200",
    badge:  "bg-red-50 text-red-600 border-red-200",
    label:  "Overdue",
    Icon:   XCircle,
    iconCls: "text-red-500",
  },
} as const;

type SprintHealthKey = keyof typeof HEALTH_CFG;

export default function DashboardClient({
  stats, projects, activities, sprints, sprintTasks,
  teamMembers, recentActivity, aiMilestones, userRole, currentMember,
}: DashboardClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = (projectId: string, newStatus: string) => {
    setUpdatingProjectId(projectId);
    startTransition(async () => {
      const res = await updateProjectStatus(projectId, newStatus);
      if (res?.error) alert(res.error);
      else router.refresh();
      setUpdatingProjectId(null);
    });
  };

  // ── Chart data (no dummy fallback) ─────────────────────────────────────────
  const chartData = (() => {
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return {
        name:     DAYS[d.getDay()],
        fullDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateStr:  d.toISOString().split("T")[0],
        activity: 0,
        tasks:    0,
      };
    });
    activities.forEach((a) => {
      const day = result.find((r) => r.dateStr === new Date(a.created_at).toISOString().split("T")[0]);
      if (day) day.activity += 1;
    });
    sprintTasks.forEach((t) => {
      const day = result.find((r) => r.dateStr === new Date(t.created_at).toISOString().split("T")[0]);
      if (day) day.tasks += 1;
    });
    return result;
  })();

  const hasChartData = chartData.some((d) => d.activity > 0 || d.tasks > 0);

  // ── Reminder tabs ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"upcoming" | "missing" | "completed">("upcoming");

  const displayedTasks = (() => {
    const now = new Date();
    const getEnd = (sprintId: string) => {
      const s = sprints.find((sp) => sp.id === sprintId);
      return s ? new Date(s.end_date) : new Date(now.getTime() + 7 * 86_400_000);
    };
    if (activeTab === "completed")
      return sprintTasks.filter((t) => t.status === "done").slice(0, 3);
    if (activeTab === "missing")
      return sprintTasks
        .filter((t) => t.status !== "done" && getEnd(t.sprint_id) < now)
        .slice(0, 3);
    return sprintTasks
      .filter((t) => t.status !== "done" && getEnd(t.sprint_id) >= now)
      .sort((a, b) => getEnd(a.sprint_id).getTime() - getEnd(b.sprint_id).getTime())
      .slice(0, 3);
  })();

  // ── Next deadline timer (no fake fallback) ─────────────────────────────────
  const [timeLeft, setTimeLeft] = useState({ days: "00", hours: "00", mins: "00" });
  const [nextDeadline, setNextDeadline] = useState<{ name: string; date: Date | null }>({
    name: "No upcoming deadlines",
    date: null,
  });

  useEffect(() => {
    const now = new Date();
    const upcoming = sprints
      .filter((s) => new Date(s.end_date) > now && s.status !== "completed")
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
    if (upcoming.length > 0) {
      setNextDeadline({ name: upcoming[0].name, date: new Date(upcoming[0].end_date) });
    }
  }, [sprints]);

  useEffect(() => {
    if (!nextDeadline.date) return;
    const tick = () => {
      const dist = nextDeadline.date!.getTime() - Date.now();
      if (dist <= 0) { setTimeLeft({ days: "00", hours: "00", mins: "00" }); return; }
      setTimeLeft({
        days:  String(Math.floor(dist / 86_400_000)).padStart(2, "0"),
        hours: String(Math.floor((dist % 86_400_000) / 3_600_000)).padStart(2, "0"),
        mins:  String(Math.floor((dist % 3_600_000) / 60_000)).padStart(2, "0"),
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [nextDeadline.date]);

  // ── Team performance (uses real performance_score) ─────────────────────────
  const teamData = [...teamMembers]
    .sort((a, b) => (b.performance_score ?? -1) - (a.performance_score ?? -1))
    .map((m) => ({
      id:     m.id,
      name:   m.full_name,
      title:  m.job_title || "",
      avatar: m.avatar_url,
      score:  m.performance_score ?? null,
    }));

  const scoredMembers = teamData.filter((m) => m.score !== null);
  const avgScore = scoredMembers.length > 0
    ? Math.round(scoredMembers.reduce((s, m) => s + (m.score ?? 0), 0) / scoredMembers.length)
    : null;

  // ── Pie chart ─────────────────────────────────────────────────────────────
  const pieSlices = [
    { name: "Completed", value: stats.endedProjects,   color: "#4F46E5" },
    { name: "Running",   value: stats.runningProjects,  color: "#818CF8" },
    { name: "Pending",   value: stats.pendingProjects,  color: "#C7D2FE" },
  ];
  const validPieData = stats.totalProjects > 0
    ? pieSlices
    : [{ name: "No Data", value: 1, color: "#e2e8f0" }];

  // ── Sprint health ──────────────────────────────────────────────────────────
  const sprintHealthData = sprints
    .filter((s) => s.status !== "completed")
    .map((sprint) => {
      const tasks     = sprintTasks.filter((t) => t.sprint_id === sprint.id);
      const totalTasks = tasks.length;
      const doneTasks  = tasks.filter((t) => t.status === "done").length;
      const taskPct    = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      const now      = Date.now();
      const start    = new Date(sprint.start_date).getTime();
      const end      = new Date(sprint.end_date).getTime();
      const duration = Math.max(1, end - start);
      const timePct  = Math.min(100, Math.max(0, Math.round(((now - start) / duration) * 100)));
      const daysLeft = Math.floor((end - now) / 86_400_000);

      const health: SprintHealthKey =
        daysLeft < 0              ? "overdue"  :
        timePct > 80 && taskPct < 60 ? "at_risk" : "on_track";

      const project = projects.find((p) => p.id === sprint.project_id);

      return {
        id:          sprint.id,
        name:        sprint.name,
        projectId:   sprint.project_id,
        projectName: project?.name ?? "Unknown Project",
        totalTasks,
        doneTasks,
        taskPct,
        timePct,
        daysLeft,
        health,
      };
    })
    .sort((a, b) => {
      const order: Record<SprintHealthKey, number> = { overdue: 0, at_risk: 1, on_track: 2 };
      return order[a.health] - order[b.health];
    });

  const isAdmin = userRole === "owner" || userRole === "pm";

  // Members with at least one in-progress or in-review task → capacity proxy
  const activeMemberIds = new Set(
    sprintTasks
      .filter((t) => t.status === "in_progress" || t.status === "in_review")
      .map((t) => t.assigned_to)
      .filter((id): id is string => Boolean(id))
  );
  const activeMembersCount = activeMemberIds.size;
  const capacityPct = stats.teamMembersCount > 0
    ? Math.round((activeMembersCount / stats.teamMembersCount) * 100)
    : 0;

  // ── Member dashboard (early return) ───────────────────────────────────────
  if (userRole === "member" && currentMember) {
    const firstName = currentMember.full_name.trim().split(/\s+/)[0];
    const h = new Date().getHours();
    const period = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    const myTasks       = sprintTasks.filter((t) => t.assigned_to === currentMember.id);
    const myTodoTasks   = myTasks.filter((t) => t.status === "backlog");
    const myActiveTasks = myTasks.filter((t) => t.status === "in_progress" || t.status === "in_review");
    const myDoneTasks   = myTasks.filter((t) => t.status === "done");

    const now = new Date();
    const mySprintIds = new Set(myTasks.map((t) => t.sprint_id));
    const myActiveSprint = sprints
      .filter((s) => mySprintIds.has(s.id) && s.status !== "completed" && new Date(s.end_date) > now)
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0] ?? null;

    const mySprintTasks  = myActiveSprint ? myTasks.filter((t) => t.sprint_id === myActiveSprint.id) : [];
    const mySprintDone   = mySprintTasks.filter((t) => t.status === "done").length;
    const mySprintPct    = mySprintTasks.length > 0 ? Math.round((mySprintDone / mySprintTasks.length) * 100) : 0;
    const mySprintDaysLeft = myActiveSprint
      ? Math.max(0, Math.floor((new Date(myActiveSprint.end_date).getTime() - now.getTime()) / 86_400_000))
      : null;
    const mySprintProject = myActiveSprint ? projects.find((p) => p.id === myActiveSprint.project_id) : null;

    const openTasksSorted = [...myTasks]
      .filter((t) => t.status !== "done")
      .map((t) => {
        const sprint = sprints.find((s) => s.id === t.sprint_id);
        return { ...t, sprintName: sprint?.name ?? "", sprintEnd: sprint?.end_date ?? "" };
      })
      .filter((t) => t.sprintEnd)
      .sort((a, b) => new Date(a.sprintEnd).getTime() - new Date(b.sprintEnd).getTime())
      .slice(0, 5);

    const TASK_STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
      backlog:     { label: "To Do",       bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
      in_progress: { label: "In Progress", bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
      in_review:   { label: "In Review",   bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
      done:        { label: "Done",        bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">

        {/* Greeting */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Good {period}, {firstName}</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">{today}</p>
            {currentMember.job_title && (
              <span className="mt-2 inline-block text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold px-2.5 py-0.5 rounded-full">
                {currentMember.job_title}
              </span>
            )}
          </div>
          {currentMember.avatar_url ? (
            <img
              src={currentMember.avatar_url}
              alt={currentMember.full_name}
              className="w-14 h-14 rounded-2xl border-2 border-slate-100 shadow-sm object-cover"
            />
          ) : (
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient(currentMember.full_name)} flex items-center justify-center text-white text-lg font-bold border-2 border-white shadow-sm`}>
              {getInitials(currentMember.full_name)}
            </div>
          )}
        </div>

        {/* Task stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

          {/* My Tasks — gradient hero */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg col-span-2 xl:col-span-1"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}
          >
            <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-200 block mb-4">My Tasks</span>
            <div className="text-5xl font-black leading-none mb-3">{myTasks.length}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-violet-100">
                {myActiveTasks.length} active
              </span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-200">
                {myDoneTasks.length} done
              </span>
            </div>
          </div>

          {/* To Do */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">To Do</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <Circle size={15} className="text-slate-500" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 leading-none mb-3">{myTodoTasks.length}</div>
            <div className="text-xs text-slate-400 font-medium">not started</div>
          </div>

          {/* In Progress */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">In Progress</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Loader2 size={15} className="text-blue-600" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 leading-none mb-3">{myActiveTasks.length}</div>
            <div className="text-xs text-slate-400 font-medium">active now</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-300 rounded-b-2xl" />
          </div>

          {/* Done */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Done</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
            </div>
            <div className="text-5xl font-black text-slate-900 leading-none mb-3">{myDoneTasks.length}</div>
            <div className="text-xs text-slate-400 font-medium">completed</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-b-2xl" />
          </div>
        </div>

        {/* Active Sprint + Open Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Active Sprint Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-900 mb-1">My Active Sprint</h3>
            <p className="text-xs text-slate-400 mb-5">Current sprint progress</p>

            {myActiveSprint ? (
              <Link
                href={`/dashboard/projects/${myActiveSprint.project_id}/sprints/${myActiveSprint.id}`}
                className="block group flex-1"
              >
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-5 hover:border-indigo-300 transition-colors h-full">
                  <div className="flex items-start justify-between gap-2 mb-5">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors truncate">
                        {myActiveSprint.name}
                      </h4>
                      {mySprintProject && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{mySprintProject.name}</p>
                      )}
                    </div>
                    {mySprintDaysLeft !== null && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-3xl font-black text-indigo-700 leading-none">{mySprintDaysLeft}</div>
                        <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide">days left</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 font-medium">
                        {mySprintDone} of {mySprintTasks.length} tasks done
                      </span>
                      <span className="text-xs font-black text-indigo-700">{mySprintPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-indigo-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                        style={{ width: `${mySprintPct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1.5">
                    <Calendar size={10} />
                    Due {new Date(myActiveSprint.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                  <Zap size={22} className="text-indigo-200" />
                </div>
                <p className="text-sm font-semibold text-slate-400">No active sprint</p>
                <p className="text-xs text-slate-300 mt-1">You have no tasks in an ongoing sprint</p>
              </div>
            )}
          </div>

          {/* My Open Tasks */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900">My Open Tasks</h3>
                <p className="text-xs text-slate-400 mt-0.5">Sorted by sprint deadline</p>
              </div>
              <Link
                href="/dashboard/projects"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View All →
              </Link>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-72">
              {openTasksSorted.length > 0 ? openTasksSorted.map((task) => {
                const cfg = TASK_STATUS_CFG[task.status] ?? TASK_STATUS_CFG.backlog;
                const dueDate = task.sprintEnd
                  ? new Date(task.sprintEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—";
                const isPast = task.sprintEnd ? new Date(task.sprintEnd) < now : false;
                return (
                  <div
                    key={task.id}
                    className={`flex gap-3 items-start p-3 rounded-xl border transition-colors ${
                      isPast ? "bg-red-50/50 border-red-100" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-slate-900 font-semibold text-sm truncate leading-tight">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[100px]">
                          {task.sprintName}
                        </span>
                        <span className={`flex items-center gap-1 text-[11px] font-medium ${isPast ? "text-red-500" : "text-slate-400"}`}>
                          <Clock size={10} /> {dueDate}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 size={32} className="text-emerald-200 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">All caught up!</p>
                  <p className="text-xs text-slate-300 mt-1">No open tasks assigned to you</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm">
          <h3 className="font-bold text-slate-900 mb-1">Recent Activity</h3>
          <p className="text-xs text-slate-400 mb-5">Latest workspace activity</p>
          {recentActivity.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentActivity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-black text-indigo-500 uppercase">
                      {(a.activity_type ?? "–").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium leading-snug line-clamp-2">{a.description}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock size={28} className="text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-400">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#E8ECF4] shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-600 shadow-lg shadow-indigo-200">
              <Plus size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">New Project</p>
              <p className="text-[11px] text-slate-400 mt-0.5">AI-powered planning</p>
            </div>
          </Link>

          <Link
            href="/dashboard/projects"
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#E8ECF4] shadow-sm hover:border-emerald-200 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-600 shadow-lg shadow-emerald-200">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">New Sprint</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pick a project to begin</p>
            </div>
          </Link>

          <Link
            href="/dashboard/team"
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#E8ECF4] shadow-sm hover:border-violet-200 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-600 shadow-lg shadow-violet-200">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm group-hover:text-violet-700 transition-colors">AI Assign</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Auto-assign sprint tasks</p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Total Projects — gradient hero */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}
        >
          <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute right-4 bottom-4 w-16 h-16 rounded-full bg-white/5 blur-xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Total Projects</span>
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <FolderKanban size={15} />
              </div>
            </div>
            <div className="text-5xl font-black leading-none mb-3">{stats.totalProjects}</div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold text-violet-100">
                {stats.runningProjects} running
              </span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-semibold text-violet-200">
                {stats.completionRate}% done
              </span>
            </div>
          </div>
        </div>

        {/* Active Sprints */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Sprints</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Zap size={15} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-5xl font-black text-slate-900 leading-none mb-3">{stats.activeSprintsCount}</div>
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {sprintTasks.filter((t) => t.status !== "done").length} open tasks
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-b-2xl" />
        </div>

        {/* Team Capacity */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E8ECF4] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capacity Used</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users size={15} className="text-violet-600" />
            </div>
          </div>
          <div className="flex items-end gap-1 leading-none mb-3">
            <span className="text-5xl font-black text-slate-900">{capacityPct}</span>
            <span className="text-lg font-bold text-slate-300 mb-0.5">%</span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {activeMembersCount} of {stats.teamMembersCount} members active
          </div>
          <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-purple-400 rounded-full transition-all duration-700"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400 to-purple-300 rounded-b-2xl" />
        </div>
      </div>

      {/* ── Middle Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Activity Chart */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900">Activity This Week</h3>
              <p className="text-xs text-slate-400 mt-0.5">Team activity &amp; task creation</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Activity
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />Tasks
              </span>
            </div>
          </div>

          {hasChartData ? (
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#38bdf8" stopOpacity={1} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc", radius: 6 }} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <Bar dataKey="activity" fill="url(#gradActivity)" radius={[5, 5, 0, 0]} barSize={12} />
                  <Bar dataKey="tasks"    fill="url(#gradTasks)"    radius={[5, 5, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <BarChart2 size={28} className="text-slate-200" />
              </div>
              <p className="text-sm font-semibold text-slate-400">No activity yet this week</p>
              <p className="text-xs text-slate-300 mt-1">Activity will appear here once the team starts working</p>
            </div>
          )}
        </div>

        {/* Task Reminders */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900">Task Reminders</h3>
            <p className="text-xs text-slate-400 mt-0.5">Sprint task tracker across all projects</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-5 gap-0.5">
            {(["missing", "upcoming", "completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[160px]">
            {displayedTasks.length > 0 ? (
              <div className="space-y-2.5">
                {displayedTasks.map((task, i) => {
                  const sprint = sprints.find((s) => s.id === task.sprint_id);
                  const dueDate = sprint
                    ? new Date(sprint.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—";
                  const isMissing = activeTab === "missing";
                  return (
                    <div key={i} className={`flex gap-3 items-start p-3 rounded-xl border transition-colors ${
                      isMissing ? "bg-red-50/50 border-red-100" : "bg-slate-50 border-slate-100"
                    }`}>
                      <div className={`mt-0.5 rounded-full p-1 flex-shrink-0 ${
                        activeTab === "completed" ? "text-emerald-600 bg-emerald-50" :
                        isMissing              ? "text-red-500 bg-red-100"       : "text-indigo-500 bg-indigo-50"
                      }`}>
                        {activeTab === "completed" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 font-semibold text-sm truncate leading-tight">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            {sprint?.name || "Sprint"}
                          </span>
                          <span className={`flex items-center gap-1 text-[11px] font-medium ${
                            isMissing ? "text-red-500" : "text-slate-400"
                          }`}>
                            <Clock size={10} /> {dueDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mx-auto mb-2 text-slate-200" size={28} />
                <p className="text-sm font-medium text-slate-400">No tasks in this view</p>
              </div>
            )}
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900">Projects</h3>
              <p className="text-xs text-slate-400 mt-0.5">{projects.length} total</p>
            </div>
            <Link
              href="/dashboard/projects/new"
              className="text-xs border border-slate-200 px-3 py-1.5 rounded-full text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-semibold transition-colors"
            >
              <Plus size={11} /> New
            </Link>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[22rem] pr-0.5">
            {projects.slice(0, 5).map((p) => (
              <ProjectRow
                key={p.id}
                p={p}
                handleStatusChange={handleStatusChange}
                updatingProjectId={updatingProjectId}
              />
            ))}
            {projects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                  <FolderKanban size={22} className="text-indigo-300" />
                </div>
                <p className="text-sm font-medium text-slate-400">No projects yet</p>
                <Link href="/dashboard/projects/new" className="text-xs text-indigo-500 hover:underline mt-1">
                  Create your first project →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* AI Milestones */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900">AI Milestones</h3>
              <p className="text-xs text-slate-400 mt-0.5">Upcoming from active projects</p>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold border border-indigo-100 uppercase tracking-wider">
              AI
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[22rem] pr-0.5">
            {aiMilestones.length > 0 ? (
              aiMilestones.slice(0, 5).map((ms, i) => (
                <Link key={ms.id || i} href={`/dashboard/projects/${ms.project_id}/roadmap`} className="block group">
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/60 transition-all">
                    <div className="bg-indigo-100 text-indigo-700 font-bold text-[11px] px-2 py-1 rounded-lg border border-indigo-200 flex-shrink-0 min-w-[36px] text-center">
                      W{ms.week_number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors leading-tight">
                        {ms.task_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{ms.project.name}</p>
                    </div>
                    <ArrowUpRight size={13} className="text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                  <Target size={22} className="text-indigo-200" />
                </div>
                <p className="text-sm font-medium text-slate-400">No AI milestones yet</p>
                <p className="text-xs text-slate-300 mt-1">Run the AI planner on a project to generate milestones</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Team Performance — real performance_score */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Team Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">AI-computed scores · 0–100</p>
            </div>
            {avgScore !== null && (
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900 leading-none">
                  {avgScore}
                  <span className="text-sm font-normal text-slate-300">/100</span>
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">team avg</div>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-72 pr-1">
            {teamData.length > 0 ? teamData.map((member) => {
              const hasScore = member.score !== null;
              const cfg = hasScore ? scoreConfig(member.score!) : null;
              return (
                <div key={member.id} className="flex items-center gap-3">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-slate-100 flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(member.name)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 border-2 border-white shadow-sm`}>
                      {getInitials(member.name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-800 truncate block leading-tight">
                          {member.name.split(" ")[0]}
                        </span>
                        {member.title && (
                          <span className="text-[10px] text-slate-400 truncate block leading-tight">{member.title}</span>
                        )}
                      </div>
                      {hasScore ? (
                        <span className={`text-xs font-bold flex-shrink-0 ml-2 ${cfg!.text}`}>
                          {member.score}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium flex-shrink-0 ml-2">–</span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${hasScore ? cfg!.bar : "bg-slate-200"}`}
                        style={{ width: hasScore ? `${member.score}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Users size={36} className="text-slate-100 mb-2" />
                <p className="text-sm font-medium text-slate-300">No team members yet</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            <div className="flex items-center gap-4">
              {[
                { color: "bg-emerald-500", label: "≥80" },
                { color: "bg-amber-400",   label: "≥60" },
                { color: "bg-red-400",     label: "<60" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/team" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              View All →
            </Link>
          </div>
        </div>

        {/* Sprint Health (owner/PM) — Project Progress (member) */}
        {isAdmin ? (
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900">Sprint Health</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sprintHealthData.length} active sprint{sprintHealthData.length !== 1 ? "s" : ""}
                </p>
              </div>
              {/* Summary pills */}
              {sprintHealthData.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {(["overdue", "at_risk", "on_track"] as SprintHealthKey[]).map((k) => {
                    const count = sprintHealthData.filter((s) => s.health === k).length;
                    if (!count) return null;
                    const cfg = HEALTH_CFG[k];
                    return (
                      <span key={k} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        {count} {cfg.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sprint list */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-72 pr-0.5">
              {sprintHealthData.length > 0 ? sprintHealthData.map((sprint) => {
                const cfg = HEALTH_CFG[sprint.health];
                return (
                  <Link
                    key={sprint.id}
                    href={`/dashboard/projects/${sprint.projectId}/sprints/${sprint.id}`}
                    className="block group"
                  >
                    <div className={`p-3 rounded-xl border transition-all hover:shadow-sm ${cfg.border}`}>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${cfg.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors leading-tight">
                              {sprint.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 leading-tight">
                              {sprint.projectName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <span className={`text-[10px] font-semibold flex-shrink-0 ${
                            sprint.health === "overdue" ? "text-red-500" : "text-slate-400"
                          }`}>
                            {sprint.daysLeft < 0
                              ? `${Math.abs(sprint.daysLeft)}d ago`
                              : sprint.daysLeft === 0
                              ? "today"
                              : `${sprint.daysLeft}d left`}
                          </span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400">
                            {sprint.doneTasks}/{sprint.totalTasks} tasks done
                          </span>
                          <span className="text-[10px] font-bold text-slate-600">{sprint.taskPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
                            style={{ width: `${sprint.taskPct}%` }}
                          />
                        </div>
                        {/* Time elapsed underlay */}
                        <div className="w-full h-0.5 bg-slate-50 rounded-full overflow-hidden mt-0.5">
                          <div
                            className="h-full rounded-full bg-slate-200 transition-all duration-700"
                            style={{ width: `${sprint.timePct}%` }}
                            title={`${sprint.timePct}% of sprint time elapsed`}
                          />
                        </div>
                        <p className="text-[9px] text-slate-300 mt-0.5 text-right">{sprint.timePct}% time elapsed</p>
                      </div>
                    </div>
                  </Link>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
                    <CheckCircle2 size={22} className="text-emerald-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">No active sprints</p>
                  <p className="text-xs text-slate-300 mt-1">Start a sprint to track health here</p>
                </div>
              )}
            </div>

            {/* Footer legend */}
            {sprintHealthData.length > 0 && (
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-4">
                {(["on_track", "at_risk", "overdue"] as SprintHealthKey[]).map((k) => {
                  const cfg = HEALTH_CFG[k];
                  const Icon = cfg.Icon;
                  return (
                    <div key={k} className="flex items-center gap-1.5">
                      <Icon size={11} className={cfg.iconCls} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{cfg.label}</span>
                    </div>
                  );
                })}
                <div className="ml-auto text-[9px] text-slate-300">
                  thin bar = time · thick bar = tasks
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Project Progress for members */
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E8ECF4] shadow-sm flex flex-col">
            <div className="mb-2">
              <h3 className="font-bold text-slate-900">Project Progress</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stats.totalProjects} total projects</p>
            </div>
            <div className="relative w-44 h-44 mx-auto mt-2 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={validPieData} innerRadius={56} outerRadius={74} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={8}>
                    {validPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900">{stats.completionRate}%</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5">Done</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {pieSlices.map(({ name, color, value }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-slate-600">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: color, width: stats.totalProjects > 0 ? `${(value / stats.totalProjects) * 100}%` : "0%" }} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 w-4 text-right">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Deadline */}
        <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl -ml-8 -mb-8 pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold mb-3 uppercase tracking-wider">
                <Clock size={12} /> Next Deadline
              </div>
              {nextDeadline.date ? (
                <>
                  <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{nextDeadline.name}</p>
                  <p className="text-slate-500 text-xs mt-1.5">
                    {nextDeadline.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  No upcoming deadlines
                </p>
              )}
            </div>

            <div className="mt-6">
              {nextDeadline.date ? (
                <>
                  <div className="flex items-end gap-0 text-white">
                    <span className="text-4xl font-mono font-light tracking-tight">{timeLeft.days}</span>
                    <span className="text-slate-600 text-2xl mx-1 mb-0.5">:</span>
                    <span className="text-4xl font-mono font-light tracking-tight">{timeLeft.hours}</span>
                    <span className="text-slate-600 text-2xl mx-1 mb-0.5">:</span>
                    <span className="text-4xl font-mono font-light tracking-tight">{timeLeft.mins}</span>
                  </div>
                  <div className="flex gap-5 mt-2">
                    {["Days", "Hrs", "Min"].map((u) => (
                      <span key={u} className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">{u}</span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-600 text-xs leading-relaxed">
                  Create a sprint to start tracking deadlines here.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
