"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../../utils/supabase/client";
import {
  Zap,
  Plus,
  ArrowRight,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  PlayCircle,
  X,
  Loader2,
  Cpu,
  ArrowLeft,
  ListChecks,
  Flag,
  Users,
  TrendingUp,
  Flame,
  AlertCircle,
  Play,
  CheckCircle,
  Lock,
  Trash2,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: "planning" | "active" | "completed";
  created_at: string;
  deleted_at?: string | null;
  milestone_ids?: string[];
  task_count?: number;
  done_count?: number;
  team_count?: number;
  assignees?: Array<{ id: string; full_name: string; job_title: string }>;
}

interface DeletedSprint {
  id: string;
  name: string;
  deleted_at: string;
}

interface Milestone {
  title: string;
  week?: number;
  week_number?: number;
  deliverable?: string;
  assigned_member_ids?: string[];
  status?: "pending" | "in_progress" | "completed" | "blocked";
}

const STATUS_CONFIG = {
  planning: {
    label: "Planning",
    icon: Clock,
    color: "slate",
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    leftAccent: "bg-slate-400",
  },
  active: {
    label: "Active",
    icon: PlayCircle,
    color: "indigo",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    leftAccent: "bg-indigo-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "emerald",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    leftAccent: "bg-emerald-500",
  },
};

const DAY = 86400000;

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function getMilestonesForSprint(
  sprint: Sprint,
  milestones: Milestone[],
  projectStart: number,
): { title: string; weekNum: number }[] {
  const sStart = new Date(sprint.start_date).getTime();
  const sEnd = new Date(sprint.end_date).getTime();
  const result: { title: string; weekNum: number }[] = [];

  milestones.forEach((ms, idx) => {
    const weekNum = ms.week || ms.week_number || idx + 1;
    const msStart = projectStart + (weekNum - 1) * 7 * DAY;
    const msEnd = projectStart + weekNum * 7 * DAY;
    if (sStart <= msEnd && sEnd >= msStart) {
      result.push({ title: ms.title, weekNum });
    }
  });
  return result;
}

function getSprintDaysInfo(sprint: Sprint): {
  daysLeft: number;
  daysElapsed: number;
  totalDays: number;
  percentElapsed: number;
} {
  const now = Date.now();
  const start = new Date(sprint.start_date).getTime();
  const end = new Date(sprint.end_date).getTime();
  const totalDays = Math.ceil((end - start) / DAY);
  const daysElapsed = Math.max(0, Math.ceil((now - start) / DAY));
  const daysLeft = Math.max(0, Math.ceil((end - now) / DAY));
  const percentElapsed =
    totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
  return { daysLeft, daysElapsed, totalDays, percentElapsed };
}

export default function SprintsPage() {
  const { id: projectId } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [deletedSprints, setDeletedSprints] = useState<DeletedSprint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<
    { task_name: string; resource_id: string }[]
  >([]);
  const [projectName, setProjectName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
    selectedMilestoneTitle: "",
  });
  const [deletingSprintId, setDeletingSprintId] = useState<string | null>(null);
  const [restoringSprintId, setRestoringSprintId] = useState<string | null>(
    null,
  );
  const [trashOpen, setTrashOpen] = useState(false);
  const [sprintActionError, setSprintActionError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const projectStart = useMemo(() => {
    if (sprints.length === 0) return 0;
    return Math.min(...sprints.map((s) => new Date(s.start_date).getTime()));
  }, [sprints]);

  const sprintsByStatus = useMemo(() => {
    const active = sprints
      .filter((s) => s.status === "active")
      .sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
      );
    const planning = sprints
      .filter((s) => s.status === "planning")
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );
    const completed = sprints
      .filter((s) => s.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
      );
    return { active, planning, completed };
  }, [sprints]);

  const stats = useMemo(() => {
    const total = sprints.length;
    const activeSprints = sprintsByStatus.active.length;
    const planningSprints = sprintsByStatus.planning.length;
    const completedSprints = sprintsByStatus.completed.length;
    const totalTasks = sprints.reduce((sum, s) => sum + (s.task_count || 0), 0);
    const completedTasks = sprints.reduce(
      (sum, s) => sum + (s.done_count || 0),
      0,
    );
    const velocity =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
      total,
      activeSprints,
      planningSprints,
      completedSprints,
      totalTasks,
      completedTasks,
      velocity,
    };
  }, [sprints, sprintsByStatus]);

  useEffect(() => {
    const load = async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("name, workspace_id, ai_data")
        .eq("id", projectId)
        .single();
      if (!project) {
        router.push("/dashboard");
        return;
      }

      setProjectName(project.name);
      setWorkspaceId(project.workspace_id);
      setMilestones(project.ai_data?.milestones || []);

      // Role check
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const [wsResult, memberResult] = await Promise.all([
          supabase
            .from("workspaces")
            .select("owner_id")
            .eq("id", project.workspace_id)
            .single(),
          supabase
            .from("workspace_members")
            .select("role")
            .eq("workspace_id", project.workspace_id)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        setIsAdmin(
          wsResult.data?.owner_id === user.id ||
            memberResult.data?.role === "pm",
        );
      }

      // Use server-side API to bypass RLS on team_members + project_assignments
      const membersRes = await fetch("/api/projects/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, workspaceId: project.workspace_id }),
      }).then((r) => r.json());
      setProjectAssignments(membersRes.projectAssignments || []);

      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [{ data: sprintRows }, { data: deletedSprintRows }] =
        await Promise.all([
          supabase
            .from("sprints")
            .select("*")
            .eq("project_id", projectId)
            .is("deleted_at", null)
            .order("start_date", { ascending: true }),
          supabase
            .from("sprints")
            .select("id, name, deleted_at")
            .eq("project_id", projectId)
            .not("deleted_at", "is", null)
            .gt("deleted_at", thirtyDaysAgo)
            .order("deleted_at", { ascending: false }),
        ]);

      setDeletedSprints((deletedSprintRows || []) as DeletedSprint[]);

      if (sprintRows && sprintRows.length > 0) {
        const memberRows: Array<{
          id: string;
          full_name: string;
          job_title: string;
        }> = membersRes.members || [];
        const [{ data: taskRows }] = await Promise.all([
          supabase
            .from("sprint_tasks")
            .select("sprint_id, status, assigned_to")
            .eq("project_id", projectId),
        ]);

        const enriched = sprintRows.map((s: any) => {
          const st = (taskRows || []).filter((t: any) => t.sprint_id === s.id);
          const assigneeIds = [
            ...new Set(st.map((t: any) => t.assigned_to).filter(Boolean)),
          ];
          const assignees = assigneeIds
            .map((id: string) =>
              (memberRows || []).find((m: any) => m.id === id),
            )
            .filter(Boolean) as Array<{
            id: string;
            full_name: string;
            job_title: string;
          }>;
          return {
            ...s,
            task_count: st.length,
            done_count: st.filter((t: any) => t.status === "done").length,
            team_count: assignees.length,
            assignees,
          };
        });
        setSprints(enriched);
      } else {
        setSprints([]);
      }

      setLoading(false);
      setMounted(true);
    };
    load();
  }, [projectId]);

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      setError("Name, start date and end date are required.");
      return;
    }
    setCreating(true);
    setError("");
    const milestone_ids = form.selectedMilestoneTitle
      ? [form.selectedMilestoneTitle]
      : [];
    const res = await fetch("/api/sprints/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        workspaceId,
        name: form.name,
        goal: form.goal,
        start_date: form.start_date,
        end_date: form.end_date,
        milestone_ids,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setCreating(false);
      return;
    }

    const newSprint = {
      ...data.sprint,
      task_count: 0,
      done_count: 0,
      team_count: 0,
    };
    setSprints((prev) =>
      [...prev, newSprint].sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      ),
    );
    setShowModal(false);
    setForm({
      name: "",
      goal: "",
      start_date: "",
      end_date: "",
      selectedMilestoneTitle: "",
    });
    setCreating(false);
  };

  const handleOpenModal = async () => {
    const [{ data: fresh }, membersRes] = await Promise.all([
      supabase.from("projects").select("ai_data").eq("id", projectId).single(),
      fetch("/api/projects/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, workspaceId }),
      }).then((r) => r.json()),
    ]);
    if (fresh?.ai_data?.milestones) setMilestones(fresh.ai_data.milestones);
    setProjectAssignments(membersRes.projectAssignments || []);
    setShowModal(true);
  };

  const handleStartSprint = async (sprintId: string) => {
    const { error } = await supabase
      .from("sprints")
      .update({ status: "active" })
      .eq("id", sprintId);
    if (!error) {
      setSprints((prev) =>
        prev.map((s) => (s.id === sprintId ? { ...s, status: "active" } : s)),
      );
    }
  };

  const handleDeleteSprint = async (sprintId: string, sprintName: string, status?: string) => {
    const warningText = status === "active"
      ? `Delete active sprint "${sprintName}"? Its tasks will be excluded from workload. It can be restored within 30 days.`
      : status === "completed"
        ? `Archive completed sprint "${sprintName}"? It can be restored within 30 days.`
        : `Move "${sprintName}" to trash? It can be restored within 30 days.`;
    if (!confirm(warningText)) return;
    setDeletingSprintId(sprintId);
    setSprintActionError("");
    const res = await fetch(`/api/sprints/manage?id=${sprintId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setSprintActionError(data.error || "Failed to delete sprint");
      setDeletingSprintId(null);
      return;
    }
    const deleted = sprints.find((s) => s.id === sprintId);
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
    if (deleted) {
      setDeletedSprints((prev) => [
        {
          id: deleted.id,
          name: deleted.name,
          deleted_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setDeletingSprintId(null);
  };

  const handleRestoreSprint = async (sprintId: string) => {
    setRestoringSprintId(sprintId);
    setSprintActionError("");
    const res = await fetch(`/api/sprints/manage?id=${sprintId}`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) {
      setSprintActionError(data.error || "Failed to restore sprint");
      setRestoringSprintId(null);
      return;
    }
    setDeletedSprints((prev) => prev.filter((s) => s.id !== sprintId));
    // Reload page to re-fetch the restored sprint with full data
    router.refresh();
    setRestoringSprintId(null);
  };

  function sprintDaysRemaining(deletedAt: string) {
    return Math.max(
      0,
      30 -
        Math.floor(
          (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24),
        ),
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
            <Cpu size={22} className="text-white" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading sprints…</p>
        </div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} /> Back to {projectName}
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ListChecks size={28} className="text-indigo-500" /> Sprint Planning
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your sprint lifecycle and track team progress
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            <Plus size={18} /> New Sprint
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {sprints.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Sprints
              </p>
              <ListChecks size={16} className="text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Now
              </p>
              <Flame size={16} className="text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {stats.activeSprints}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Planned
              </p>
              <Clock size={16} className="text-slate-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {stats.planningSprints}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Velocity
              </p>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {stats.velocity}%
            </p>
          </div>
        </div>
      )}

      {sprints.length === 0 ? (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-dashed border-indigo-200 rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 shadow-sm">
            <Zap size={40} className="text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No Sprints Yet
          </h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Create your first sprint to start tracking team progress and
            delivering value in organized iterations.
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200"
            >
              <Plus size={20} /> Create First Sprint
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Sprints */}
          {sprintsByStatus.active.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200">
                <Flame size={20} className="text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  Active Sprints
                </h2>
                <span className="ml-auto text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                  {sprintsByStatus.active.length}
                </span>
              </div>
              <div className="grid gap-4">
                {sprintsByStatus.active.map((sprint) => {
                  const progress = sprint.task_count
                    ? Math.round((sprint.done_count! / sprint.task_count) * 100)
                    : 0;
                  const start = new Date(sprint.start_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  );
                  const end = new Date(sprint.end_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  );
                  const linkedMilestoneItems =
                    (sprint.milestone_ids || []).length > 0
                      ? ((sprint.milestone_ids || [])
                          .map((title, i) => {
                            const idx = milestones.findIndex(
                              (m) => m.title === title,
                            );
                            const ms = milestones[idx >= 0 ? idx : i];
                            return ms
                              ? {
                                  title: ms.title,
                                  weekNum: ms.week || ms.week_number || idx + 1,
                                }
                              : null;
                          })
                          .filter(Boolean) as {
                          title: string;
                          weekNum: number;
                        }[])
                      : projectStart > 0
                        ? getMilestonesForSprint(
                            sprint,
                            milestones,
                            projectStart,
                          )
                        : [];
                  const daysInfo = getSprintDaysInfo(sprint);
                  const cfg = STATUS_CONFIG[sprint.status];

                  return (
                    <div
                      key={sprint.id}
                      className={`bg-white border ${cfg.border} rounded-2xl overflow-hidden hover:shadow-lg transition-all group`}
                    >
                      <div className={`h-1 ${cfg.leftAccent}`} />
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
                              >
                                <cfg.icon size={12} /> {cfg.label}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {start} – {end}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">
                              {sprint.name}
                            </h3>
                            {sprint.goal && (
                              <p className="text-sm text-slate-600 mt-1">
                                {sprint.goal}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            <Link
                              href={`/dashboard/projects/${projectId}/sprints/${sprint.id}`}
                              className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors border border-indigo-100"
                            >
                              Open <ArrowRight size={12} />
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteSprint(sprint.id, sprint.name, sprint.status)}
                                disabled={deletingSprintId === sprint.id}
                                title="Delete sprint"
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 disabled:opacity-50"
                              >
                                {deletingSprintId === sprint.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Timeline bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                            <span>
                              {daysInfo.daysElapsed}/{daysInfo.totalDays} days •
                              Day {daysInfo.daysElapsed}
                            </span>
                            <span>{daysInfo.daysLeft} days left</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700"
                              style={{ width: `${daysInfo.percentElapsed}%` }}
                            />
                          </div>
                        </div>

                        {/* Task progress */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Tasks
                            </p>
                            <p className="text-xl font-bold text-slate-900">
                              {sprint.done_count}/{sprint.task_count}
                            </p>
                            <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Progress
                            </p>
                            <p className="text-xl font-bold text-slate-900">
                              {progress}%
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Team
                            </p>
                            <p className="text-xl font-bold text-slate-900">
                              {sprint.team_count || 0}
                            </p>
                          </div>
                        </div>

                        {/* Milestones */}
                        {sprint.assignees && sprint.assignees.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                            <div className="flex -space-x-1.5">
                              {sprint.assignees.slice(0, 6).map((m) => (
                                <div
                                  key={m.id}
                                  title={m.full_name || m.job_title}
                                  className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center border-2 border-white"
                                >
                                  {getInitials(m.full_name || m.job_title)}
                                </div>
                              ))}
                              {sprint.assignees.length > 6 && (
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[8px] font-bold flex items-center justify-center border-2 border-white">
                                  +{sprint.assignees.length - 6}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              {sprint.assignees.length} member
                              {sprint.assignees.length !== 1 ? "s" : ""}{" "}
                              assigned
                            </span>
                          </div>
                        )}
                        {linkedMilestoneItems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                            {linkedMilestoneItems.map((ms) => (
                              <span
                                key={ms.weekNum}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-[10px] font-semibold"
                              >
                                <Flag size={10} /> W{ms.weekNum} · {ms.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Planning Sprints */}
          {sprintsByStatus.planning.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200">
                <Clock size={20} className="text-slate-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  Upcoming Sprints
                </h2>
                <span className="ml-auto text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {sprintsByStatus.planning.length}
                </span>
              </div>
              <div className="grid gap-4">
                {sprintsByStatus.planning.map((sprint) => {
                  const start = new Date(sprint.start_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  );
                  const end = new Date(sprint.end_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  );
                  const linkedMilestoneItems =
                    (sprint.milestone_ids || []).length > 0
                      ? ((sprint.milestone_ids || [])
                          .map((title, i) => {
                            const idx = milestones.findIndex(
                              (m) => m.title === title,
                            );
                            const ms = milestones[idx >= 0 ? idx : i];
                            return ms
                              ? {
                                  title: ms.title,
                                  weekNum: ms.week || ms.week_number || idx + 1,
                                }
                              : null;
                          })
                          .filter(Boolean) as {
                          title: string;
                          weekNum: number;
                        }[])
                      : projectStart > 0
                        ? getMilestonesForSprint(
                            sprint,
                            milestones,
                            projectStart,
                          )
                        : [];
                  const daysUntilStart = Math.ceil(
                    (new Date(sprint.start_date).getTime() - Date.now()) / DAY,
                  );
                  const cfg = STATUS_CONFIG[sprint.status];

                  return (
                    <div
                      key={sprint.id}
                      className={`bg-white border ${cfg.border} rounded-2xl overflow-hidden hover:shadow-lg transition-all`}
                    >
                      <div className={`h-1 ${cfg.leftAccent}`} />
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
                              >
                                <cfg.icon size={12} /> {cfg.label}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {start} – {end}
                              </span>
                              {daysUntilStart >= 0 && (
                                <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                  Starts in {daysUntilStart} days
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {sprint.name}
                            </h3>
                            {sprint.goal && (
                              <p className="text-sm text-slate-600 mt-1">
                                {sprint.goal}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => handleStartSprint(sprint.id)}
                                className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors border border-emerald-200"
                              >
                                <Play size={12} /> Start
                              </button>
                            )}
                            <Link
                              href={`/dashboard/projects/${projectId}/sprints/${sprint.id}`}
                              className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors border border-indigo-100"
                            >
                              Open <ArrowRight size={12} />
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() =>
                                  handleDeleteSprint(sprint.id, sprint.name, sprint.status)
                                }
                                disabled={deletingSprintId === sprint.id}
                                title="Move to trash"
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 disabled:opacity-50"
                              >
                                {deletingSprintId === sprint.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Task count preview */}
                        <div className="flex gap-3 mb-4 text-sm">
                          <span className="text-slate-600 font-medium">
                            {sprint.task_count || 0} tasks planned
                          </span>
                          {sprint.team_count ? (
                            <span className="text-slate-600 font-medium flex items-center gap-1">
                              <Users size={14} /> {sprint.team_count} assigned
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">
                              No assignments yet
                            </span>
                          )}
                        </div>

                        {/* Milestones */}
                        {sprint.assignees && sprint.assignees.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                            <div className="flex -space-x-1.5">
                              {sprint.assignees.slice(0, 6).map((m) => (
                                <div
                                  key={m.id}
                                  title={m.full_name || m.job_title}
                                  className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center border-2 border-white"
                                >
                                  {getInitials(m.full_name || m.job_title)}
                                </div>
                              ))}
                              {sprint.assignees.length > 6 && (
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[8px] font-bold flex items-center justify-center border-2 border-white">
                                  +{sprint.assignees.length - 6}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              {sprint.assignees.length} member
                              {sprint.assignees.length !== 1 ? "s" : ""}{" "}
                              assigned
                            </span>
                          </div>
                        )}
                        {linkedMilestoneItems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                            {linkedMilestoneItems.map((ms) => (
                              <span
                                key={ms.weekNum}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-[10px] font-semibold"
                              >
                                <Flag size={10} /> W{ms.weekNum} · {ms.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Sprints */}
          {sprintsByStatus.completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-200">
                <CheckCircle size={20} className="text-emerald-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  Completed Sprints
                </h2>
                <span className="ml-auto text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  {sprintsByStatus.completed.length}
                </span>
              </div>
              <div className="grid gap-4">
                {sprintsByStatus.completed.map((sprint) => {
                  const progress = sprint.task_count
                    ? Math.round((sprint.done_count! / sprint.task_count) * 100)
                    : 0;
                  const start = new Date(sprint.start_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  );
                  const end = new Date(sprint.end_date).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  );
                  const linkedMilestoneItems =
                    (sprint.milestone_ids || []).length > 0
                      ? ((sprint.milestone_ids || [])
                          .map((title, i) => {
                            const idx = milestones.findIndex(
                              (m) => m.title === title,
                            );
                            const ms = milestones[idx >= 0 ? idx : i];
                            return ms
                              ? {
                                  title: ms.title,
                                  weekNum: ms.week || ms.week_number || idx + 1,
                                }
                              : null;
                          })
                          .filter(Boolean) as {
                          title: string;
                          weekNum: number;
                        }[])
                      : projectStart > 0
                        ? getMilestonesForSprint(
                            sprint,
                            milestones,
                            projectStart,
                          )
                        : [];
                  const cfg = STATUS_CONFIG[sprint.status];

                  return (
                    <div
                      key={sprint.id}
                      className={`bg-white border ${cfg.border} rounded-2xl overflow-hidden opacity-75 hover:opacity-100 transition-opacity`}
                    >
                      <div className={`h-1 ${cfg.leftAccent}`} />
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}
                              >
                                <cfg.icon size={12} /> {cfg.label}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar size={12} /> {start} – {end}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {sprint.name}
                            </h3>
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            <Link
                              href={`/dashboard/projects/${projectId}/sprints/${sprint.id}`}
                              className="px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
                            >
                              View <ArrowRight size={12} />
                            </Link>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteSprint(sprint.id, sprint.name, sprint.status)}
                                disabled={deletingSprintId === sprint.id}
                                title="Archive sprint"
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 disabled:opacity-50"
                              >
                                {deletingSprintId === sprint.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Task completion */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Completed
                            </p>
                            <p className="text-xl font-bold text-slate-900">
                              {sprint.done_count}/{sprint.task_count}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Success Rate
                            </p>
                            <p className="text-xl font-bold text-emerald-600">
                              {progress}%
                            </p>
                          </div>
                        </div>

                        {/* Milestones */}
                        {sprint.assignees && sprint.assignees.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                            <div className="flex -space-x-1.5">
                              {sprint.assignees.slice(0, 6).map((m) => (
                                <div
                                  key={m.id}
                                  title={m.full_name || m.job_title}
                                  className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[8px] font-bold flex items-center justify-center border-2 border-white"
                                >
                                  {getInitials(m.full_name || m.job_title)}
                                </div>
                              ))}
                              {sprint.assignees.length > 6 && (
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[8px] font-bold flex items-center justify-center border-2 border-white">
                                  +{sprint.assignees.length - 6}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-medium">
                              {sprint.assignees.length} member
                              {sprint.assignees.length !== 1 ? "s" : ""}{" "}
                              assigned
                            </span>
                          </div>
                        )}
                        {linkedMilestoneItems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                            {linkedMilestoneItems.map((ms) => (
                              <span
                                key={ms.weekNum}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-semibold"
                              >
                                <Flag size={10} /> W{ms.weekNum} · {ms.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sprint action errors */}
      {sprintActionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} />
          {sprintActionError}
          <button
            onClick={() => setSprintActionError("")}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Recently Deleted Sprints — admin only */}
      {isAdmin && deletedSprints.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setTrashOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
              <Trash2 size={15} className="text-red-400" />
              Recently Deleted Sprints
              <span className="bg-red-50 text-red-500 border border-red-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {deletedSprints.length}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform duration-200 ${trashOpen ? "rotate-180" : ""}`}
            />
          </button>

          {trashOpen && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {deletedSprints.map((s) => {
                const days = sprintDaysRemaining(s.deleted_at);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {days > 0
                          ? `Permanently deleted in ${days} day${days !== 1 ? "s" : ""}`
                          : "Expires today"}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        days <= 3
                          ? "bg-red-50 text-red-600 border-red-200"
                          : days <= 7
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {days}d left
                    </span>
                    <button
                      onClick={() => handleRestoreSprint(s.id)}
                      disabled={restoringSprintId === s.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {restoringSprintId === s.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Sprint Modal — admin only */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Create New Sprint
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Sprint Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Sprint 1 — Foundation Setup"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Sprint Goal
                </label>
                <textarea
                  value={form.goal}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, goal: e.target.value }))
                  }
                  placeholder="What should this sprint achieve?"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, start_date: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, end_date: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Milestone selection */}
              {milestones.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Flag size={13} className="text-violet-500" /> Link to
                    Milestone{" "}
                    <span className="text-slate-400 font-normal text-xs">
                      (optional)
                    </span>
                  </label>
                  <select
                    value={form.selectedMilestoneTitle}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        selectedMilestoneTitle: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  >
                    <option value="">No Milestone (Standalone Sprint)</option>
                    {milestones.map((ms, idx) => {
                      const isCompleted = ms.status === "completed";
                      return (
                        <option
                          key={idx}
                          value={ms.title}
                          disabled={isCompleted}
                        >
                          {isCompleted ? "✓ " : ""}Week{" "}
                          {ms.week || ms.week_number || idx + 1}: {ms.title}
                          {isCompleted ? " (Completed)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {form.selectedMilestoneTitle &&
                    milestones.find(
                      (m) => m.title === form.selectedMilestoneTitle,
                    )?.status === "completed" && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle size={11} /> This milestone is completed —
                        choose a different one or create a standalone sprint.
                      </p>
                    )}
                </div>
              )}

              {/* Selected milestone info */}
              {form.selectedMilestoneTitle &&
                (() => {
                  const normalized = form.selectedMilestoneTitle
                    .trim()
                    .toLowerCase();
                  const ms = milestones.find(
                    (m) => (m.title || "").trim().toLowerCase() === normalized,
                  );
                  if (!ms) return null;

                  // Check team assignment from EITHER source:
                  // 1. project_assignments (Team Allocation page)
                  // 2. ai_data.milestones[].assigned_member_ids (MilestoneList page)
                  const allocationMembers = projectAssignments.filter(
                    (a) =>
                      (a.task_name || "").trim().toLowerCase() === normalized,
                  );
                  const totalAssigned =
                    allocationMembers.length > 0
                      ? allocationMembers.length
                      : (ms.assigned_member_ids?.length ?? 0);
                  const hasTeam = totalAssigned > 0;

                  return (
                    <div
                      className={`rounded-xl border px-4 py-3 ${hasTeam ? "bg-violet-50 border-violet-200" : "bg-amber-50 border-amber-200"}`}
                    >
                      {ms.deliverable && (
                        <p className="text-xs text-slate-600 mb-2 italic">
                          {ms.deliverable}
                        </p>
                      )}
                      {hasTeam ? (
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                          <Users size={12} /> {totalAssigned} member
                          {totalAssigned !== 1 ? "s" : ""} assigned to this
                          milestone
                        </p>
                      ) : (
                        <div className="flex items-start gap-2">
                          <AlertCircle
                            size={13}
                            className="text-amber-600 flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <p className="text-xs font-semibold text-amber-700">
                              No team assigned yet
                            </p>
                            <p className="text-[11px] text-amber-600 mt-0.5">
                              Assign team members via the Team Allocation page
                              before using AI Populate.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                  {error}
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Create Sprint
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
