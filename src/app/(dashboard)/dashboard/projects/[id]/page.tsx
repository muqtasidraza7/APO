"use client";

import { createClient } from "../../../../utils/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GanttChart,
  Calendar,
  DollarSign,
  Users,
  RefreshCw,
  ListChecks,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Target,
  ArrowUpRight,
  Pencil,
  Share2,
  Copy,
  Check,
  X,
} from "lucide-react";
import DynamicFieldRenderer from "../../../../components/DynamicFieldRenderer";
import { getProjectTemplate } from "../../../../utils/projectTemplates";
import MilestoneList from "../../../../components/MilestoneList";
import ProjectBlueprintEditor from "../../../../components/ProjectBlueprintEditor";
import ProjectHealthWidget from "../../../../components/ProjectHealthWidget";

// ── Hero progress ring ────────────────────────────────────────────────────────
function HeroRing({ percent }: { percent: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, percent)) / 100) * circ;
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="9"
      />
      {/* Progress */}
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="9"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      {/* Labels */}
      <text
        x="70"
        y="63"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="white"
      >
        {percent}%
      </text>
      <text
        x="70"
        y="80"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        fill="rgba(255,255,255,0.45)"
        letterSpacing="2"
      >
        COMPLETE
      </text>
    </svg>
  );
}

// ── Skill chip color cycling ──────────────────────────────────────────────────
const SKILL_COLORS = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
];

// ── Risk helpers ──────────────────────────────────────────────────────────────
function getRiskLevel(risk: any): "high" | "medium" | "low" {
  const s = (typeof risk === "object" ? risk?.severity : null)?.toLowerCase();
  if (s === "high" || s === "critical") return "high";
  if (s === "medium") return "medium";
  return "low";
}

const RISK_STYLE = {
  high: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    label: "High",
    dot: "bg-red-500",
  },
  medium: {
    bar: "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    label: "Med",
    dot: "bg-orange-400",
  },
  low: {
    bar: "bg-yellow-400",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    label: "Low",
    dot: "bg-yellow-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [projectTeam, setProjectTeam] = useState<any[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; full_name: string; job_title: string }[]
  >([]);
  const [milestoneSprintStatuses, setMilestoneSprintStatuses] = useState<
    Record<
      number,
      {
        status: string;
        taskCount: number;
        assignedCount: number;
        doneCount: number;
        sprintName: string;
      }
    >
  >({});
  const supabase = useMemo(() => createClient(), []);

  const handleMilestoneUpdate = async (milestoneId: string, updates: any) => {
    const response = await fetch("/api/update-milestone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestoneId, projectId: id, updates }),
    });
    if (!response.ok) throw new Error("Failed to update milestone");
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();
    if (data) setProject(data);
  };

  const handleGenerateShare = async () => {
    if (!project) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch("/api/project-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          workspaceId: project.workspace_id,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setShareToken(json.token);
      } else {
        setShareError(json.error || "Failed to generate share link.");
      }
    } catch {
      setShareError("Network error — please try again.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShare = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (!data) {
        setLoading(false);
        return;
      }
      setProject(data);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // RBAC + sprints in parallel
      const [wsResult, memberResult, sprintsResult] = await Promise.all([
        supabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", data.workspace_id)
          .single(),
        supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", data.workspace_id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("sprints")
          .select("id, name, start_date, end_date, status")
          .eq("workspace_id", data.workspace_id)
          .eq("project_id", data.id),
      ]);

      setIsAdmin(
        wsResult.data?.owner_id === user.id || memberResult.data?.role === "pm",
      );

      const sprintList: any[] = sprintsResult.data || [];
      const sprintIds = sprintList.map((s: any) => s.id);

      // Always fetch workspace team members (needed for milestone team assignment)
      const { data: members } = await supabase
        .from("team_members")
        .select("id, user_id, full_name, job_title, avatar_url")
        .eq("workspace_id", data.workspace_id);

      setWorkspaceMembers(
        (members || []).map((m: any) => ({
          id: m.id,
          full_name: m.full_name || m.job_title || "",
          job_title: m.job_title || "",
        })),
      );

      // ── Project assignments (AI allocation) — fetch regardless of sprints ──
      const { data: allocations } = await supabase
        .from("project_assignments")
        .select("resource_id, task_name")
        .eq("project_id", data.id);
      const allocationMap = new Map<string, number>();
      (allocations || []).forEach((a: any) => {
        allocationMap.set(a.resource_id, (allocationMap.get(a.resource_id) || 0) + 1);
      });

      if (sprintIds.length > 0) {
        const { data: tasks } = await supabase
          .from("sprint_tasks")
          .select("id, assigned_to, status, sprint_id")
          .in("sprint_id", sprintIds);

        // ── Team progress: union of sprint-task members + allocated members ──
        const enriched = (members || [])
          .map((m: any) => {
            const myTasks = (tasks || []).filter(
              (t: any) => t.assigned_to === m.id || t.assigned_to === m.user_id,
            );
            const milestoneCount = allocationMap.get(m.id) || 0;
            if (myTasks.length === 0 && milestoneCount === 0) return null;
            const done = myTasks.filter(
              (t: any) => t.status === "done" || t.status === "completed",
            ).length;
            const role = m.job_title || "Team Member";
            const parts = role.trim().split(/\s+/);
            const initials =
              parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : parts[0].substring(0, 2).toUpperCase();
            const hasTasks = myTasks.length > 0;
            return {
              ...m,
              role,
              initials,
              totalTasks: hasTasks ? myTasks.length : milestoneCount,
              completedTasks: done,
              pct: hasTasks ? Math.round((done / myTasks.length) * 100) : 0,
              fromAllocation: !hasTasks,
            };
          })
          .filter(Boolean);
        setProjectTeam(enriched as any[]);

        // ── Milestone auto-status from sprint tasks ─────────────────────
        const sortedSprints = [...sprintList].sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        );
        const projectStart = new Date(sortedSprints[0].start_date).getTime();
        const DAY = 86400000;
        const projectMilestones: any[] = data.ai_data?.milestones || [];

        const derived: typeof milestoneSprintStatuses = {};
        projectMilestones.forEach((ms: any, idx: number) => {
          const weekNum = ms.week || ms.week_number || idx + 1;
          const msWeekStart = projectStart + (weekNum - 1) * 7 * DAY;
          const msWeekEnd = projectStart + weekNum * 7 * DAY;

          const matchedSprint = sortedSprints.find((s) => {
            const sStart = new Date(s.start_date).getTime();
            const sEnd = new Date(s.end_date).getTime();
            return sStart <= msWeekEnd && sEnd >= msWeekStart;
          });
          if (!matchedSprint) return;

          const sprintTasks = (tasks || []).filter(
            (t: any) => t.sprint_id === matchedSprint.id,
          );
          const taskCount = sprintTasks.length;
          const assignedCount = sprintTasks.filter(
            (t: any) => t.assigned_to !== null,
          ).length;
          const doneCount = sprintTasks.filter(
            (t: any) => t.status === "done" || t.status === "completed",
          ).length;
          const activeCount = sprintTasks.filter(
            (t: any) => t.status === "in_progress" || t.status === "in_review",
          ).length;

          let status: string;
          if (
            matchedSprint.status === "completed" ||
            (taskCount > 0 && doneCount === taskCount)
          ) {
            status = "completed";
          } else if (
            taskCount > 0 &&
            (activeCount > 0 ||
              assignedCount > 0 ||
              matchedSprint.status === "active")
          ) {
            status = "in_progress";
          } else {
            status = "pending";
          }

          derived[idx] = {
            status,
            taskCount,
            assignedCount,
            doneCount,
            sprintName: matchedSprint.name,
          };
        });
        setMilestoneSprintStatuses(derived);
      } else if (allocationMap.size > 0) {
        // No sprints yet — build team list from AI allocations only
        const enriched = (members || [])
          .map((m: any) => {
            const milestoneCount = allocationMap.get(m.id) || 0;
            if (milestoneCount === 0) return null;
            const role = m.job_title || "Team Member";
            const parts = role.trim().split(/\s+/);
            const initials =
              parts.length > 1
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : parts[0].substring(0, 2).toUpperCase();
            return {
              ...m,
              role,
              initials,
              totalTasks: milestoneCount,
              completedTasks: 0,
              pct: 0,
              fromAllocation: true,
            };
          })
          .filter(Boolean);
        setProjectTeam(enriched as any[]);
      }

      setLoading(false);
    };

    fetchProject();

    const channel = supabase
      .channel(`project-updates-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setProject(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
    if (project?.ai_status === "parsing") {
      fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      }).catch(console.error);
    }
  }, [project?.ai_status, id]);

  useEffect(() => {
    if (project?.ai_status !== "parsing" && project?.ai_status !== "idle")
      return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (data && data.ai_status !== "parsing" && data.ai_status !== "idle") {
        setProject(data);
        clearInterval(poll);
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [project?.ai_status, id, supabase]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm font-medium">Loading project…</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-red-500 font-medium">Project not found.</p>
      </div>
    );
  }

  // ── AI Parsing ──────────────────────────────────────────────────────────────
  if (project.ai_status === "parsing" || project.ai_status === "idle") {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-in fade-in duration-500">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-indigo-500">
            <FileText size={26} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Analyzing "{project.name}"
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Our AI is extracting milestones, budget, and resource requirements
          from your document.
        </p>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-slate-900 font-medium text-sm">
            <CheckCircle2 size={16} className="text-emerald-500" /> Document
            uploaded
          </div>
          <div className="flex items-center gap-3 text-indigo-600 font-medium text-sm">
            <Loader2 size={16} className="animate-spin" /> Extracting data with
            AI
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Clock size={16} /> Generating timeline
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 text-sm text-slate-400 hover:text-slate-600 flex items-center gap-2 mx-auto transition-colors"
        >
          <RefreshCw size={13} /> Stuck? Refresh page
        </button>
      </div>
    );
  }

  // ── Failed ──────────────────────────────────────────────────────────────────
  if (project.ai_status !== "completed") {
    return (
      <div className="max-w-sm mx-auto py-20 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          Analysis Failed
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          The AI could not process the document.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  const data = project.ai_data || {};
  const template =
    project.project_type && project.project_type !== "general"
      ? getProjectTemplate(project.project_type)
      : null;

  // Milestone progress
  const milestones: any[] = data.milestones || [];
  const completedMs = milestones.filter((m) => m.status === "completed").length;
  const progressPct =
    milestones.length > 0
      ? Math.round((completedMs / milestones.length) * 100)
      : 0;

  // Risks grouped by severity
  const risks: any[] = data.risks || [];
  const riskCounts = { high: 0, medium: 0, low: 0 };
  risks.forEach((r) => {
    riskCounts[getRiskLevel(r)]++;
  });

  const projectTools = [
    {
      href: `/dashboard/projects/${id}/sprints`,
      icon: ListChecks,
      label: "Sprints",
      description: "Plan & track 2-week sprint tasks across the team",
      iconBg: "bg-indigo-600",
      glow: "shadow-indigo-100",
      border: "border-indigo-100 hover:border-indigo-300",
      bg: "hover:bg-indigo-50/60",
      textColor: "text-indigo-700",
    },
    {
      href: `/dashboard/projects/${id}/allocation`,
      icon: Users,
      label: "Team Allocation",
      description: "Assign members to tasks and balance workload",
      iconBg: "bg-violet-600",
      glow: "shadow-violet-100",
      border: "border-violet-100 hover:border-violet-300",
      bg: "hover:bg-violet-50/60",
      textColor: "text-violet-700",
      adminOnly: true,
    },
    {
      href: `/dashboard/projects/${id}/roadmap`,
      icon: Calendar,
      label: "Mission Timeline",
      description:
        "Visual milestone roadmap with sprints, teams and live progress tracking",
      iconBg: "bg-sky-600",
      glow: "shadow-sky-100",
      border: "border-sky-100 hover:border-sky-300",
      bg: "hover:bg-sky-50/60",
      textColor: "text-sky-700",
    },
    {
      href: `/dashboard/projects/${id}/risk-radar`,
      icon: ShieldAlert,
      label: "AI Risk Radar",
      description:
        "Real-time threat detection — burndown, overload, conflicts and deadline risks",
      iconBg: "bg-rose-600",
      glow: "shadow-rose-100",
      border: "border-rose-100 hover:border-rose-300",
      bg: "hover:bg-rose-50/60",
      textColor: "text-rose-700",
    },
    {
      href: `/dashboard/projects/${id}/analytics`,
      icon: BarChart3,
      label: "Financials",
      description: "Monitor budget vs actuals and flag overruns early",
      iconBg: "bg-emerald-600",
      glow: "shadow-emerald-100",
      border: "border-emerald-100 hover:border-emerald-300",
      bg: "hover:bg-emerald-50/60",
      textColor: "text-emerald-700",
    },
    {
      href: `/dashboard/projects/${id}/gantt`,
      icon: GanttChart,
      label: "Gantt Chart",
      description:
        "Date-axis bar chart of all milestones and sprints in one view",
      iconBg: "bg-amber-500",
      glow: "shadow-amber-100",
      border: "border-amber-100 hover:border-amber-300",
      bg: "hover:bg-amber-50/60",
      textColor: "text-amber-700",
    },
  ];

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link
          href="/dashboard/projects"
          className="hover:text-slate-900 transition-colors font-medium"
        >
          Projects
        </Link>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-900 font-semibold truncate max-w-xs">
          {project.name}
        </span>
      </div>

      {/* ── COMMAND CENTER HERO ──────────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl relative overflow-hidden shadow-xl shadow-slate-900/20">
        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 p-7 md:p-9">
          {/* Top row: badges + refresh */}
          <div className="flex items-start justify-between mb-7">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Sparkles size={11} /> AI Complete
              </span>
              {template && (
                <span className="inline-flex items-center gap-1.5 bg-white/8 border border-white/15 text-white/70 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  {template.icon} {template.name}
                </span>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => setEditingBlueprint(true)}
                title="Edit project blueprint"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 hover:text-indigo-200 rounded-xl text-xs font-semibold transition-all"
              >
                <Pencil size={12} />
                Edit Blueprint
              </button>
            )}
            <button
              onClick={() => setShowSharePanel((v) => !v)}
              title="Share project with client"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/90 rounded-xl text-xs font-semibold transition-all"
            >
              <Share2 size={12} />
              Share
            </button>
            {isAdmin && (
              <button
                onClick={() => setProject({ ...project, ai_status: "parsing" })}
                title="Re-run AI analysis"
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 rounded-xl transition-all"
              >
                <RefreshCw size={15} />
              </button>
            )}
          </div>

          {/* Main row: name + ring */}
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1 min-w-0">
              {/* Gradient project name */}
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-300 via-violet-200 to-white bg-clip-text text-transparent leading-tight mb-3 tracking-tight">
                {project.name}
              </h1>
              {data.summary && (
                <p className="text-white/50 text-sm leading-relaxed max-w-2xl">
                  {data.summary}
                </p>
              )}
            </div>

            {/* Progress ring */}
            <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0">
              <HeroRing percent={progressPct} />
              <p className="text-white/35 text-[11px] font-semibold uppercase tracking-widest">
                {completedMs}/{milestones.length} milestones
              </p>
            </div>
          </div>

          {/* Metric tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              {
                label: "Est. Budget",
                value: data.budget_estimate
                  ? `${data.currency || "$"}${Number(data.budget_estimate).toLocaleString()}`
                  : "—",
                icon: DollarSign,
                color: "text-indigo-300",
              },
              {
                label: "Timeline",
                value: data.timeline_weeks
                  ? `${data.timeline_weeks} Weeks`
                  : "—",
                icon: Calendar,
                color: "text-violet-300",
              },
              {
                label: "Risks",
                value: risks.length > 0 ? `${risks.length} Identified` : "None",
                icon: ShieldAlert,
                color: risks.length > 0 ? "text-red-400" : "text-emerald-400",
              },
              {
                label: "Milestones",
                value:
                  milestones.length > 0
                    ? `${completedMs} / ${milestones.length}`
                    : "—",
                icon: Target,
                color: "text-emerald-300",
              },
            ].map((tile) => (
              <div
                key={tile.label}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <tile.icon size={13} className={tile.color} />
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {tile.label}
                  </p>
                </div>
                <p className="text-white font-bold text-xl leading-none">
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SHARE PANEL ──────────────────────────────────────────────────────── */}
      {isAdmin && showSharePanel && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900">
                Share Project
              </h3>
            </div>
            <button
              onClick={() => setShowSharePanel(false)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={15} className="text-slate-400" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Generate a read-only link for your client. The link shows project
            status, milestones, and team size — no sensitive data.
          </p>
          {shareError && (
            <p className="text-xs text-red-500 mb-3">{shareError}</p>
          )}
          {shareToken ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`}
                className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
              />
              <button
                onClick={handleCopyShare}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${shareCopied ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {shareCopied ? (
                  <>
                    <Check size={13} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateShare}
              disabled={shareLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors"
            >
              {shareLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Share2 size={13} />
              )}
              {shareLoading ? "Generating…" : "Generate Share Link"}
            </button>
          )}
        </div>
      )}

      {/* ── AI HEALTH SCORE ─────────────────────────────────────────────────── */}
      {project.ai_status === "completed" && (
        <ProjectHealthWidget projectId={project.id} />
      )}

      {/* ── PROJECT TOOLS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {projectTools.filter(tool => isAdmin || !tool.adminOnly).map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className={`group flex items-center gap-4 bg-white border ${tool.border} ${tool.bg} rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
          >
            <div
              className={`w-10 h-10 ${tool.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}
            >
              <tool.icon size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${tool.textColor} truncate`}>
                {tool.label}
              </p>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                {tool.description}
              </p>
            </div>
            <ArrowUpRight
              size={15}
              className="text-slate-300 flex-shrink-0 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
            />
          </Link>
        ))}
      </div>

      {/* ── CONTENT GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Milestones — 2/3 */}
        <div className="lg:col-span-2">
          <MilestoneList
            milestones={milestones}
            projectId={project.id}
            editable={isAdmin}
            onMilestoneUpdate={handleMilestoneUpdate}
            sprintStatuses={milestoneSprintStatuses}
            teamMembers={workspaceMembers}
          />
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-5">
          {/* Required Skills */}
          {data.required_skills && data.required_skills.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
                    <Target size={13} className="text-indigo-600" />
                  </div>
                  Required Skills
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {data.required_skills.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.required_skills.map((skill: string, i: number) => (
                  <span
                    key={skill}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${SKILL_COLORS[i % SKILL_COLORS.length]}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {risks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center">
                    <ShieldAlert size={13} className="text-red-500" />
                  </div>
                  Risk Assessment
                </h3>
                <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                  {risks.length}
                </span>
              </div>

              {/* Severity heatmap */}
              <div className="space-y-2.5 mb-5">
                {(["high", "medium", "low"] as const).map((level) => {
                  const s = RISK_STYLE[level];
                  const count = riskCounts[level];
                  const width =
                    risks.length > 0
                      ? Math.round((count / risks.length) * 100)
                      : 0;
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-400 w-10 uppercase">
                        {s.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${s.bar} rounded-full transition-all duration-700`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 w-4 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Individual risks */}
              <div className="space-y-2.5">
                {risks.map((risk: any, i: number) => {
                  const isObj = typeof risk === "object" && risk !== null;
                  const desc = isObj ? risk.description : risk;
                  const mitigation = isObj ? risk.mitigation : null;
                  const level = getRiskLevel(risk);
                  const s = RISK_STYLE[level];

                  return (
                    <div
                      key={i}
                      className="border border-slate-100 rounded-xl p-3 bg-slate-50/60"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800 leading-snug flex-1">
                              {desc}
                            </p>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${s.badge}`}
                            >
                              {s.label}
                            </span>
                          </div>
                          {mitigation && (
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                              <span className="font-semibold">Fix: </span>
                              {mitigation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project Team */}
          {projectTeam.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 bg-violet-50 border border-violet-100 rounded-lg flex items-center justify-center">
                    <Users size={13} className="text-violet-600" />
                  </div>
                  Project Team
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {projectTeam.length} members
                </span>
              </div>

              <div className="space-y-3">
                {projectTeam.map((member: any) => {
                  const barColor =
                    member.pct >= 67
                      ? "bg-emerald-500"
                      : member.pct >= 34
                        ? "bg-amber-400"
                        : "bg-red-400";
                  const pctLabel =
                    member.pct >= 67
                      ? "text-emerald-600"
                      : member.pct >= 34
                        ? "text-amber-600"
                        : "text-red-500";

                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      {/* Avatar */}
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.role}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold">
                          {member.initials}
                        </div>
                      )}

                      {/* Info + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {member.role}
                          </p>
                          <span
                            className={`text-[11px] font-bold ml-2 flex-shrink-0 ${pctLabel}`}
                          >
                            {member.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-700`}
                            style={{ width: `${member.pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {member.fromAllocation
                            ? `${member.totalTasks} milestone${member.totalTasks !== 1 ? "s" : ""} assigned`
                            : `${member.completedTasks}/${member.totalTasks} tasks done`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ADDITIONAL DATA ───────────────────────────────────────────────────── */}
      <DynamicFieldRenderer
        data={{
          client_info: project.client_info,
          success_criteria: project.success_criteria,
          custom_fields: project.custom_fields,
        }}
        projectType={project.project_type}
      />

      {/* ── BLUEPRINT EDITOR ─────────────────────────────────────────────────── */}
      {editingBlueprint && (
        <ProjectBlueprintEditor
          project={project}
          onClose={() => setEditingBlueprint(false)}
          onSaved={async () => {
            setEditingBlueprint(false);
            const { data: refreshed } = await supabase
              .from("projects")
              .select("*")
              .eq("id", id)
              .single();
            if (refreshed) setProject(refreshed);
          }}
        />
      )}
    </div>
  );
}
