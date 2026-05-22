"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/utils/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Plus,
  X,
  Loader2,
  Cpu,
  CheckCircle2,
  Clock,
  PlayCircle,
  Eye,
  Target,
  Calendar,
  Zap,
  AlertTriangle,
  Flag,
  TrendingUp,
  ListChecks,
  TrendingDown,
  Play,
  ChevronDown,
  Users,
  Timer,
  Check,
  Link2,
  Link2Off,
  OctagonAlert,
} from "lucide-react";

interface SprintTask {
  id: string;
  title: string;
  description: string | null;
  effort_level: "low" | "medium" | "high";
  time_estimate_hours: number | null;
  actual_hours: number | null;
  status: "backlog" | "in_progress" | "in_review" | "done";
  priority: "high" | "medium" | "low";
  assigned_to: string | null;
  assigned_member?: { id: string; full_name: string; job_title: string } | null;
  created_by_ai: boolean;
  completed_at: string | null;
}

interface TaskDependency {
  id: string;
  task_id: string; // the BLOCKED task (cannot start)
  depends_on_id: string; // the BLOCKER (must finish first)
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: "planning" | "active" | "completed";
  project_id: string;
  workspace_id: string;
  milestone_ids?: string[];
}

const COLUMNS = [
  {
    id: "backlog",
    label: "Backlog",
    icon: <Clock size={14} />,
    color: "bg-slate-100",
    border: "border-slate-300",
    dot: "bg-slate-400",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: <PlayCircle size={14} />,
    color: "bg-blue-50",
    border: "border-blue-300",
    dot: "bg-blue-500",
  },
  {
    id: "in_review",
    label: "In Review",
    icon: <Eye size={14} />,
    color: "bg-amber-50",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  {
    id: "done",
    label: "Done",
    icon: <CheckCircle2 size={14} />,
    color: "bg-green-50",
    border: "border-green-300",
    dot: "bg-green-500",
  },
] as const;

const PRIORITY_CFG = {
  high: { label: "High", cls: "bg-red-100 text-red-700" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700" },
  low: { label: "Low", cls: "bg-slate-100 text-slate-600" },
};

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

export default function SprintBoardPage() {
  const { id: projectId, sid: sprintId } = useParams() as {
    id: string;
    sid: string;
  };
  const router = useRouter();
  const supabase = createClient();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    { id: string; full_name: string; job_title: string; user_id: string }[]
  >([]);
  const [projectMilestones, setProjectMilestones] = useState<
    { title: string; assigned_member_ids?: string[] }[]
  >([]);
  const [projectAssignments, setProjectAssignments] = useState<
    { task_name: string; resource_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [retroNotes, setRetroNotes] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addColumn, setAddColumn] = useState<string>("backlog");
  const [addForm, setAddForm] = useState<{
    title: string;
    description: string;
    effort_level: "low" | "medium" | "high";
    time_estimate_hours: number;
    priority: string;
    assigned_to: string;
  }>({
    title: "",
    description: "",
    effort_level: "medium",
    time_estimate_hours: 4,
    priority: "medium",
    assigned_to: "",
  });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [logHoursTaskId, setLogHoursTaskId] = useState<string | null>(null);
  const [logHoursValue, setLogHoursValue] = useState("");
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [depPickerTaskId, setDepPickerTaskId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    const { data: sprintData } = await supabase
      .from("sprints")
      .select("*")
      .eq("id", sprintId)
      .single();
    if (!sprintData) {
      router.push(`/dashboard/projects/${projectId}/sprints`);
      return;
    }
    setSprint(sprintData);

    const depsRes = await fetch(
      `/api/sprints/dependencies?sprint_id=${sprintId}`,
    );
    if (depsRes.ok) {
      const depsData = await depsRes.json();
      setDependencies(depsData.dependencies || []);
    }

    const [{ data: taskData }, { data: projectData }, membersRes] =
      await Promise.all([
        supabase
          .from("sprint_tasks")
          .select("*")
          .eq("sprint_id", sprintId)
          .order("created_at", { ascending: true }),
        supabase
          .from("projects")
          .select("ai_data")
          .eq("id", sprintData.project_id)
          .single(),
        // Fetch team members + project assignments via server-side API (bypasses RLS)
        fetch("/api/projects/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: sprintData.project_id,
            workspaceId: sprintData.workspace_id,
          }),
        })
          .then((r) => r.json())
          .catch(() => ({ members: [], projectAssignments: [] })),
      ]);

    const members: {
      id: string;
      full_name: string;
      job_title: string;
      user_id: string;
    }[] = Array.isArray(membersRes.members) ? membersRes.members : [];
    const assignmentData: { task_name: string; resource_id: string }[] =
      Array.isArray(membersRes.projectAssignments)
        ? membersRes.projectAssignments
        : [];

    // Enrich tasks in JS — no PostgREST FK join needed
    const enrichedTasks = (taskData || []).map((t: any) => ({
      ...t,
      assigned_member: t.assigned_to
        ? (members.find((m: any) => m.id === t.assigned_to) ?? null)
        : null,
    }));

    setTasks(enrichedTasks);
    setTeamMembers(members);
    setProjectMilestones(projectData?.ai_data?.milestones || []);
    setProjectAssignments(assignmentData);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [wsResult, memberResult] = await Promise.all([
        supabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", sprintData.workspace_id)
          .single(),
        supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", sprintData.workspace_id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      const isOwner = wsResult.data?.owner_id === user.id;
      setIsAdmin(isOwner || memberResult.data?.role === "pm");

      const currentMember = members.find((m) => m.user_id === user.id);
      setCurrentMemberId(currentMember?.id ?? null);
    }
    setLoading(false);
  }, [sprintId, projectId]);

  useEffect(() => {
    load();
    setMounted(true);
  }, [load]);

  useEffect(() => {
    const handler = () => {
      setReassignTaskId(null);
      setDepPickerTaskId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Drag and Drop handlers
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || sprint?.status === "completed") {
      e.preventDefault();
      return;
    }
    const canDrag = isAdmin || (currentMemberId && task.assigned_to === currentMemberId);
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!dragTaskId) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    if (!task || task.status === colId) {
      setDragTaskId(null);
      return;
    }

    // Block moving to active columns if task has unmet dependencies
    if (colId !== "backlog" && colId !== "done") {
      const blockers = blockedMap.get(dragTaskId);
      if (blockers?.length) {
        setDragTaskId(null);
        showToast(
          `🔒 Blocked by: ${blockers.map((b) => b.blockerTitle).join(", ")}`,
        );
        return;
      }
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === dragTaskId ? { ...t, status: colId as any } : t,
      ),
    );
    setDragTaskId(null);

    const res = await fetch("/api/sprints/task-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: dragTaskId, status: colId, projectId }),
    });
    if (!res.ok) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) =>
          t.id === dragTaskId ? { ...t, status: task.status } : t,
        ),
      );
      showToast("Failed to update task status");
    } else {
      if (colId === "done") showToast(`✅ "${task.title}" completed!`);
    }
  };

  const handleAIPopulate = async () => {
    if (!sprint) return;

    // Check if sprint has milestone association
    if (!sprint.milestone_ids || sprint.milestone_ids.length === 0) {
      showToast(
        "⚠️ This sprint is not linked to any milestone. Manually add tasks using 'New Task'.",
      );
      return;
    }

    setIsAILoading(true);
    const res = await fetch("/api/sprints/ai-populate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sprintId,
        projectId,
        workspaceId: sprint.workspace_id,
      }),
    });
    const data = await res.json();
    setIsAILoading(false);
    if (!res.ok) {
      showToast(`AI Error: ${data.error}`);
      return;
    }
    showToast(
      `✨ AI added ${data.count} tasks to the backlog! (Phase ${data.phase}: ${data.phaseName})`,
    );
    // Immediately show returned tasks, then reload for full enrichment
    if (data.tasks?.length) {
      const enriched = data.tasks.map((t: any) => ({
        ...t,
        assigned_member: t.assigned_to
          ? (teamMembers.find((m) => m.id === t.assigned_to) ?? null)
          : null,
      }));
      setTasks((prev) => [...prev, ...enriched]);
    }
    load();
  };

  const handleAddTask = async () => {
    if (!addForm.title.trim()) {
      setAddError("Title is required.");
      return;
    }
    if (!sprint) return;
    setAddLoading(true);
    setAddError("");
    const res = await fetch("/api/sprints/task-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sprintId,
        projectId,
        workspaceId: sprint.workspace_id,
        title: addForm.title,
        description: addForm.description || null,
        effort_level: addForm.effort_level,
        time_estimate_hours: addForm.time_estimate_hours,
        priority: addForm.priority,
        assigned_to: addForm.assigned_to || null,
      }),
    });
    const data = await res.json();
    setAddLoading(false);
    if (!res.ok) {
      setAddError(data.error);
      return;
    }
    const enrichedTask = {
      ...data.task,
      assigned_member: data.task.assigned_to
        ? (teamMembers.find((m) => m.id === data.task.assigned_to) ?? null)
        : null,
    };
    setTasks((prev) => [...prev, enrichedTask]);
    setShowAddModal(false);
    setAddForm({
      title: "",
      description: "",
      effort_level: "medium",
      time_estimate_hours: 4,
      priority: "medium",
      assigned_to: "",
    });
    showToast("Task added!");
  };

  const handleCloseSprint = async () => {
    if (!sprint) return;
    setIsClosing(true);
    const res = await fetch("/api/sprints/close", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sprintId: sprint.id,
        retrospective_notes: retroNotes,
      }),
    });
    setIsClosing(false);
    if (res.ok) {
      setSprint((prev) => (prev ? { ...prev, status: "completed" } : prev));
      setShowCloseModal(false);
      showToast("Sprint closed successfully!");
    }
  };

  const handleStartSprint = async () => {
    if (!sprint) return;
    const { error } = await supabase
      .from("sprints")
      .update({ status: "active" })
      .eq("id", sprint.id);

    if (error) {
      showToast("Failed to start sprint");
    } else {
      setSprint((prev) => (prev ? { ...prev, status: "active" } : prev));
      showToast("Sprint started!");
    }
  };

  const handleReassign = async (taskId: string, memberId: string | null) => {
    setReassignTaskId(null);
    const member = memberId ? teamMembers.find((m) => m.id === memberId) : null;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assigned_to: memberId,
              assigned_member: member
                ? {
                    id: member.id,
                    full_name: member.full_name,
                    job_title: member.job_title,
                  }
                : null,
            }
          : t,
      ),
    );
    const { error } = await supabase
      .from("sprint_tasks")
      .update({ assigned_to: memberId })
      .eq("id", taskId);
    if (error) {
      showToast("Failed to update assignment");
      load();
    } else {
      showToast(
        memberId
          ? `Assigned to ${member?.full_name || "member"}`
          : "Assignment removed",
      );
    }
  };

  const handleLogHours = async (taskId: string) => {
    const hrs = parseFloat(logHoursValue);
    if (isNaN(hrs) || hrs < 0) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, actual_hours: hrs === 0 ? null : hrs } : t,
      ),
    );
    setLogHoursTaskId(null);
    setLogHoursValue("");
    const res = await fetch("/api/sprints/log-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, actualHours: hrs }),
    });
    if (!res.ok) {
      showToast("Failed to log hours");
      load();
    } else {
      showToast(hrs === 0 ? "Hours cleared" : `Logged ${hrs}h`);
    }
  };

  // Client-side cycle detection: is `targetId` reachable from `startId` following dep chain?
  const wouldCreateCycle = (startId: string, targetId: string): boolean => {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === targetId) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      dependencies
        .filter((d) => d.depends_on_id === cur)
        .forEach((d) => queue.push(d.task_id));
    }
    return false;
  };

  const handleAddDep = async (taskId: string, dependsOnId: string) => {
    if (!sprint) return;
    setDepPickerTaskId(null);
    // Optimistic
    const tempId = `temp-${Date.now()}`;
    setDependencies((prev) => [
      ...prev,
      { id: tempId, task_id: taskId, depends_on_id: dependsOnId },
    ]);
    const res = await fetch("/api/sprints/dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        dependsOnId,
        projectId,
        workspaceId: sprint.workspace_id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDependencies((prev) => prev.filter((d) => d.id !== tempId));
      showToast(`Dependency error: ${data.error}`);
    } else {
      setDependencies((prev) =>
        prev.map((d) => (d.id === tempId ? data.dependency : d)),
      );
      showToast("Dependency added");
    }
  };

  const handleRemoveDep = async (depId: string) => {
    setDependencies((prev) => prev.filter((d) => d.id !== depId));
    const res = await fetch(`/api/sprints/dependencies?id=${depId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      showToast("Failed to remove dependency");
      load();
    }
  };

  if (loading || !sprint)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
            <Cpu size={22} className="text-white" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading sprint…</p>
        </div>
      </div>
    );

  // Unique team members who have at least one task in this sprint
  const sprintAssignees = (() => {
    const seen = new Set<string>();
    return tasks
      .filter((t) => t.assigned_to && t.assigned_member)
      .filter((t) => {
        if (seen.has(t.assigned_to!)) return false;
        seen.add(t.assigned_to!);
        return true;
      })
      .map((t) => t.assigned_member!);
  })();

  // ── Team member filtering ───────────────────────────────────────────────────
  const isStandalone =
    !sprint.milestone_ids || sprint.milestone_ids.length === 0;
  const linkedMilestoneTitle = !isStandalone ? sprint.milestone_ids![0] : null;
  const linkedMilestone = linkedMilestoneTitle
    ? (projectMilestones.find(
        (m) =>
          m.title.trim().toLowerCase() ===
          linkedMilestoneTitle.trim().toLowerCase(),
      ) ?? null)
    : null;

  // IDs from project_assignments for this milestone (Team Allocation page)
  const normalizedLinkedTitle = (linkedMilestoneTitle ?? "")
    .trim()
    .toLowerCase();
  const allocationIds = !isStandalone
    ? projectAssignments
        .filter(
          (a) =>
            (a.task_name || "").trim().toLowerCase() === normalizedLinkedTitle,
        )
        .map((a) => a.resource_id)
    : [];
  // IDs from ai_data.milestones (MilestoneList page) as fallback
  const milestoneIds = linkedMilestone?.assigned_member_ids ?? [];
  const combinedIds = new Set([...allocationIds, ...milestoneIds]);

  // Members scoped to this milestone (empty = milestone has no assignments yet)
  const filteredTeamMembers =
    !isStandalone && combinedIds.size > 0
      ? teamMembers.filter((m) => combinedIds.has(m.id))
      : [];

  const milestoneHasTeam = isStandalone || combinedIds.size > 0;

  // Rule:
  //   Milestone sprint → show ONLY members assigned to that milestone
  //   Standalone sprint → show ALL workspace members
  //   Milestone sprint with no assignments yet → fall back to all (so user can still assign)
  const addTaskMembers: typeof teamMembers = isStandalone
    ? teamMembers
    : filteredTeamMembers.length > 0
      ? filteredTeamMembers
      : teamMembers;

  // Calculate effort hours instead of story points
  const totalHours = tasks.reduce(
    (s, t) => s + (t.time_estimate_hours || 0),
    0,
  );
  const doneHours = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.time_estimate_hours || 0), 0);
  const totalActualHours = tasks.reduce(
    (s, t) => s + (t.actual_hours != null ? t.actual_hours : 0),
    0,
  );
  const progressPct =
    totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : 0;
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);
  const durationDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysElapsed = Math.max(
    0,
    Math.min(
      durationDays,
      Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)),
    ),
  );
  const idealPct =
    durationDays > 0 ? Math.round((daysElapsed / durationDays) * 100) : 0;

  // Per-task block status: taskId → [{depId, blockerTitle}] for unfinished blockers
  const blockedMap = new Map<
    string,
    { depId: string; blockerTitle: string }[]
  >();
  for (const dep of dependencies) {
    const blocker = tasks.find((t) => t.id === dep.depends_on_id);
    if (!blocker) continue;
    if (blocker.status === "done") continue; // dep satisfied
    if (!blockedMap.has(dep.task_id)) blockedMap.set(dep.task_id, []);
    blockedMap
      .get(dep.task_id)!
      .push({ depId: dep.id, blockerTitle: blocker.title });
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-green-200 shadow-xl rounded-2xl px-5 py-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-green-500" />
          <span className="text-sm font-medium text-slate-900">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/projects/${projectId}/sprints`}
            className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} /> All Sprints
          </Link>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{sprint.name}</h1>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                sprint.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : sprint.status === "active"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {sprint.status}
            </span>
          </div>
          {sprint.goal && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Target size={13} className="text-indigo-400" /> {sprint.goal}
            </p>
          )}
          {mounted && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(sprint.start_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              –{" "}
              {new Date(sprint.end_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              ({durationDays} days)
            </p>
          )}
          {sprintAssignees.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Users size={12} className="text-slate-400 flex-shrink-0" />
              <div className="flex -space-x-1.5">
                {sprintAssignees.slice(0, 8).map((m) => (
                  <div
                    key={m.id}
                    title={m.full_name || m.job_title}
                    className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center border-2 border-white"
                  >
                    {getInitials(m.full_name || m.job_title)}
                  </div>
                ))}
                {sprintAssignees.length > 8 && (
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[8px] font-bold flex items-center justify-center border-2 border-white">
                    +{sprintAssignees.length - 8}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {sprintAssignees.length} member
                {sprintAssignees.length !== 1 ? "s" : ""} assigned
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/dashboard/projects/${projectId}/sprints/${sprintId}/burndown`}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors border border-indigo-100"
          >
            <TrendingDown size={15} /> View Burndown
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {sprint.status !== "completed" && !isStandalone && (
                <button
                  onClick={handleAIPopulate}
                  disabled={isAILoading || !milestoneHasTeam}
                  title={
                    !milestoneHasTeam
                      ? "Assign team to this milestone first"
                      : ""
                  }
                  className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-violet-100 transition-all"
                >
                  {isAILoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  {isAILoading ? "Generating..." : "AI Populate"}
                </button>
              )}
              <button
                onClick={() => {
                  setAddColumn("backlog");
                  setShowAddModal(true);
                }}
                className="bg-indigo-600 text-white hover:bg-indigo-700 py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus size={18} /> New Task
              </button>

              {sprint.status === "planning" && (
                <button
                  onClick={handleStartSprint}
                  className="bg-green-600 text-white hover:bg-green-700 py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <Play size={18} /> Start Sprint
                </button>
              )}

              {sprint.status === "active" && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <CheckCircle2 size={18} /> Close Sprint
                </button>
              )}

              {sprint.status === "completed" && (
                <button className="bg-green-100 text-green-700 py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 opacity-50 cursor-not-allowed">
                  Completed
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Tasks",
            value: tasks.length,
            color: "text-slate-900",
          },
          {
            label: totalActualHours > 0 ? "Actual / Est" : "Effort Hours",
            value:
              totalActualHours > 0
                ? `${totalActualHours}/${totalHours}h`
                : `${doneHours}/${totalHours}h`,
            color: "text-indigo-600",
          },
          {
            label: "Completion",
            value: `${progressPct}%`,
            color: progressPct >= idealPct ? "text-green-600" : "text-red-500",
          },
          {
            label: "Day",
            value: `${daysElapsed}/${durationDays}`,
            color: "text-amber-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Burndown bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold flex items-center gap-1">
            <TrendingUp size={12} className="text-indigo-400" /> Sprint Burndown
          </span>
          {mounted && (
            <span>
              Ideal:{" "}
              <span className="font-bold text-indigo-500">{idealPct}%</span>{" "}
              done by today
            </span>
          )}
        </div>
        <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          {mounted && (
            <div
              className="absolute h-full bg-indigo-100 rounded-full"
              style={{ width: `${idealPct}%` }}
            />
          )}
          <div
            className="absolute h-full bg-indigo-600 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>0%</span>
          {mounted && (
            <span
              className={
                progressPct >= idealPct
                  ? "text-green-600 font-semibold"
                  : "text-red-500 font-semibold"
              }
            >
              {progressPct >= idealPct
                ? "✓ On Track"
                : `⚠ ${idealPct - progressPct}% behind`}
            </span>
          )}
          <span>100%</span>
        </div>
      </div>

      {/* Milestone team warnings */}
      {isStandalone && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Flag size={15} className="text-slate-400 flex-shrink-0" />
          <p className="text-sm text-slate-500">
            This is a <span className="font-semibold">standalone sprint</span>{" "}
            (not linked to any milestone). AI Populate is only available for
            milestone-linked sprints.
          </p>
        </div>
      )}
      {!isStandalone && !milestoneHasTeam && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              No team assigned to this milestone
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Assign members to{" "}
              <span className="font-semibold">{sprint.milestone_ids![0]}</span>{" "}
              on the project page before using AI Populate.
            </p>
          </div>
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="flex-shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
          >
            Project Page <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const colHours = colTasks.reduce(
            (s, t) => s + (t.time_estimate_hours || 0),
            0,
          );
          return (
            <div
              key={col.id}
              className={`rounded-2xl border-2 ${col.border} ${col.color} flex flex-col min-h-[500px]`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-current border-opacity-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="font-semibold text-sm text-slate-700">
                      {col.label}
                    </span>
                    <span className="bg-white/80 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-current border-opacity-20">
                      {colTasks.length}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {colHours}h
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-3 flex-1 space-y-3">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={
                      !!(sprint.status !== "completed" &&
                      (isAdmin || (currentMemberId && task.assigned_to === currentMemberId)))
                    }
                    onDragStart={(e) => onDragStart(e, task.id)}
                    className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all select-none ${
                      sprint.status !== "completed" && (isAdmin || (currentMemberId && task.assigned_to === currentMemberId))
                        ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-200"
                        : "cursor-not-allowed opacity-80"
                    } ${dragTaskId === task.id ? "opacity-50" : ""}`}
                  >
                    {/* Blocked banner — shown at very top when task has unmet deps */}
                    {blockedMap.has(task.id) && (
                      <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                        <OctagonAlert
                          size={11}
                          className="text-amber-600 flex-shrink-0"
                        />
                        <span className="text-[10px] font-bold text-amber-700 truncate">
                          BLOCKED — waiting on{" "}
                          {blockedMap
                            .get(task.id)!
                            .map((b) => b.blockerTitle)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CFG[task.priority].cls}`}
                      >
                        {PRIORITY_CFG[task.priority].label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {task.created_by_ai && (
                          <Sparkles size={11} className="text-indigo-400" />
                        )}
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                          {task.effort_level}
                          {task.time_estimate_hours && (
                            <span className="ml-1">
                              ({task.time_estimate_hours}h)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug mb-2">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    {/* Hours logging */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      {logHoursTaskId === task.id ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Timer
                            size={11}
                            className="text-emerald-500 flex-shrink-0"
                          />
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            step="0.5"
                            value={logHoursValue}
                            onChange={(e) => setLogHoursValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleLogHours(task.id);
                              if (e.key === "Escape") {
                                setLogHoursTaskId(null);
                                setLogHoursValue("");
                              }
                            }}
                            placeholder="0"
                            className="w-16 text-xs border border-slate-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                          <span className="text-[10px] text-slate-400">
                            hrs
                          </span>
                          <button
                            onClick={() => handleLogHours(task.id)}
                            className="p-0.5 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => {
                              setLogHoursTaskId(null);
                              setLogHoursValue("");
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogHoursTaskId(task.id);
                            setLogHoursValue(
                              task.actual_hours != null
                                ? String(task.actual_hours)
                                : "",
                            );
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Timer size={11} />
                          {task.actual_hours != null ? (
                            <span className="font-semibold text-emerald-600">
                              {task.actual_hours}h logged
                            </span>
                          ) : (
                            <span>Log actual hours</span>
                          )}
                          {task.time_estimate_hours && (
                            <span className="text-slate-300">
                              / {task.time_estimate_hours}h est
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Dependencies section */}
                    {sprint.status !== "completed" &&
                      (() => {
                        const myBlockers = dependencies.filter(
                          (d) => d.task_id === task.id,
                        );
                        const blocking = dependencies.filter(
                          (d) => d.depends_on_id === task.id,
                        );
                        const available = tasks.filter(
                          (t) =>
                            t.id !== task.id &&
                            !myBlockers.some((d) => d.depends_on_id === t.id) &&
                            !wouldCreateCycle(task.id, t.id),
                        );

                        return (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                            {/* Existing blockers as chips */}
                            {myBlockers.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {myBlockers.map((dep) => {
                                  const blocker = tasks.find(
                                    (t) => t.id === dep.depends_on_id,
                                  );
                                  if (!blocker) return null;
                                  return (
                                    <span
                                      key={dep.id}
                                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                                        blocker.status === "done"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      <Link2
                                        size={8}
                                        className="flex-shrink-0"
                                      />
                                      <span className="max-w-[80px] truncate">
                                        {blocker.title}
                                      </span>
                                      {blocker.status === "done" && (
                                        <CheckCircle2
                                          size={8}
                                          className="text-emerald-500 flex-shrink-0"
                                        />
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveDep(dep.id);
                                        }}
                                        className="ml-0.5 hover:text-red-600 flex-shrink-0"
                                      >
                                        <X size={8} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* "Blocking N tasks" note */}
                            {blocking.length > 0 && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Link2Off size={9} />
                                Blocking {blocking.length} task
                                {blocking.length !== 1 ? "s" : ""}
                              </p>
                            )}

                            {/* Native select — no z-index / propagation issues */}
                            {available.length > 0 && (
                              <select
                                value=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    e.stopPropagation();
                                    handleAddDep(task.id, val);
                                  }
                                  e.target.value = "";
                                }}
                                className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1 text-slate-500 bg-white cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              >
                                <option value="">+ Add dependency…</option>
                                {available.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.title} [{t.status.replace("_", " ")}]
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })()}

                    {/* Assignee — click to reassign */}
                    <div className="relative mt-2 pt-2 border-t border-slate-100">
                      <div
                        onClick={(e) => {
                          if (!isAdmin) return;
                          e.stopPropagation();
                          setReassignTaskId((prev) =>
                            prev === task.id ? null : task.id,
                          );
                        }}
                        className={`flex items-center gap-1.5 select-none transition-opacity ${isAdmin ? "cursor-pointer hover:opacity-75" : "cursor-default"}`}
                      >
                        {task.assigned_member ? (
                          <>
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                              {getInitials(
                                task.assigned_member.full_name ||
                                  task.assigned_member.job_title,
                              )}
                            </div>
                            <span className="text-xs text-slate-500 truncate flex-1 min-w-0">
                              {task.assigned_member.full_name ||
                                task.assigned_member.job_title}
                            </span>
                            <ChevronDown
                              size={10}
                              className="text-slate-300 flex-shrink-0"
                            />
                          </>
                        ) : (
                          <>
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center flex-shrink-0">
                              <Plus size={8} className="text-slate-300" />
                            </div>
                            <span className="text-xs text-slate-400">
                              Assign
                            </span>
                          </>
                        )}
                      </div>

                      {reassignTaskId === task.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 w-52 max-h-52 overflow-y-auto"
                        >
                          <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Assign to
                          </p>
                          <button
                            onClick={() => handleReassign(task.id, null)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left ${!task.assigned_to ? "bg-slate-50" : ""}`}
                          >
                            <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex-shrink-0" />
                            <span className="text-slate-500 flex-1">
                              Unassigned
                            </span>
                            {!task.assigned_to && (
                              <CheckCircle2
                                size={11}
                                className="text-slate-400"
                              />
                            )}
                          </button>
                          {addTaskMembers.length === 0 && (
                            <p className="px-3 py-2 text-xs text-slate-400 italic">
                              No team members
                            </p>
                          )}
                          {addTaskMembers.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => handleReassign(task.id, m.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left ${task.assigned_to === m.id ? "bg-indigo-50" : ""}`}
                            >
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                                {getInitials(m.full_name || m.job_title)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-800 truncate">
                                  {m.full_name || m.job_title}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {m.job_title}
                                </div>
                              </div>
                              {task.assigned_to === m.id && (
                                <CheckCircle2
                                  size={11}
                                  className="text-indigo-500 flex-shrink-0"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-slate-300 text-xs text-center border-2 border-dashed border-current border-opacity-30 rounded-xl">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-indigo-500" /> Add Task
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddError("");
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Description
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Optional details..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    Effort Level
                  </label>
                  <div className="flex gap-2">
                    {["low", "medium", "high"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          setAddForm((p) => ({
                            ...p,
                            effort_level: level as "low" | "medium" | "high",
                          }))
                        }
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${
                          addForm.effort_level === level
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    Time (hours)
                  </label>
                  <input
                    type="number"
                    value={addForm.time_estimate_hours || ""}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        time_estimate_hours: e.target.value
                          ? parseInt(e.target.value)
                          : 0,
                      }))
                    }
                    min="1"
                    max="40"
                    placeholder="e.g. 4"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                    Priority
                  </label>
                  <select
                    value={addForm.priority}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, priority: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Assign To
                  {!isStandalone && filteredTeamMembers.length > 0 && (
                    <span className="ml-1.5 font-normal text-indigo-500 normal-case">
                      — milestone team only
                    </span>
                  )}
                </label>
                {addTaskMembers.length > 0 ? (
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    value={addForm.assigned_to}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, assigned_to: e.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {addTaskMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.job_title}
                        {m.job_title ? ` (${m.job_title})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-400 italic px-1">
                    No team members found. Add members on the{" "}
                    <a
                      href="/dashboard/team"
                      className="text-indigo-500 underline"
                    >
                      Team page
                    </a>
                    .
                  </p>
                )}
              </div>
              {addError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
                  {addError}
                </p>
              )}
              <button
                onClick={handleAddTask}
                disabled={addLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {addLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Adding...
                  </>
                ) : (
                  <>
                    <Plus size={15} /> Add Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Sprint Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Close Sprint</h2>
                  <p className="text-xs text-slate-500">
                    {tasks.filter((t) => t.status === "done").length}/
                    {tasks.length} tasks completed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-2 hover:bg-indigo-100 rounded-xl transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Retrospective Notes (optional)
                </label>
                <textarea
                  value={retroNotes}
                  onChange={(e) => setRetroNotes(e.target.value)}
                  placeholder="What went well? What could be improved?"
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              </div>
              {tasks.filter((t) => t.status !== "done").length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    {tasks.filter((t) => t.status !== "done").length} incomplete
                    task(s) will remain in the backlog.
                  </span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseSprint}
                  disabled={isClosing}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isClosing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Closing...
                    </>
                  ) : (
                    "Close Sprint"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
