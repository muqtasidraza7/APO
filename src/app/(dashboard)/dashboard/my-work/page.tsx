"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import {
  Briefcase, CheckCircle2, Clock, AlertTriangle, Loader2,
  FolderOpen, Flag, Circle, ChevronDown, ChevronRight, RefreshCw,
} from "lucide-react";

interface MyTask {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  sprint_name: string;
  project_name: string;
  project_id: string;
  sprint_id: string;
  due_date?: string;
}

interface GroupedProject {
  project_id: string;
  project_name: string;
  tasks: MyTask[];
}

const STATUS_CFG = {
  todo:        { label: "To Do",       icon: <Circle size={13} className="text-slate-400" />,         badge: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "In Progress", icon: <Clock size={13} className="text-amber-500" />,          badge: "bg-amber-50 text-amber-700 border-amber-200"  },
  done:        { label: "Done",        icon: <CheckCircle2 size={13} className="text-emerald-500" />, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const NEXT_STATUS: Record<string, "todo" | "in_progress" | "done"> = {
  todo:        "in_progress",
  in_progress: "done",
  done:        "todo",
};

export default function MyWorkPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get team_member id for this user
      const { data: member } = await supabase
        .from("team_members")
        .select("id, workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) return;

      // Fetch tasks assigned to this team member
      const { data: sprintTasks } = await supabase
        .from("sprint_tasks")
        .select("id, title, status, sprint_id, project_id")
        .eq("workspace_id", member.workspace_id)
        .eq("assigned_to", member.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!sprintTasks?.length) { setTasks([]); return; }

      // Fetch sprint names
      const sprintIds = [...new Set(sprintTasks.map(t => t.sprint_id))];
      const { data: sprints } = await supabase
        .from("sprints")
        .select("id, name")
        .in("id", sprintIds);

      // Fetch project names
      const projectIds = [...new Set(sprintTasks.map(t => t.project_id).filter(Boolean))];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);

      const sprintMap = new Map((sprints || []).map(s => [s.id, s.name]));
      const projectMap = new Map((projects || []).map(p => [p.id, p.name]));

      const enriched: MyTask[] = sprintTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: (t.status as MyTask["status"]) || "todo",
        sprint_name: sprintMap.get(t.sprint_id) || "Sprint",
        project_name: projectMap.get(t.project_id) || "Project",
        project_id: t.project_id,
        sprint_id: t.sprint_id,
      }));

      setTasks(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyTasks(); }, []);

  const toggleStatus = async (task: MyTask) => {
    const next = NEXT_STATUS[task.status];
    setUpdatingId(task.id);
    try {
      await supabase
        .from("sprint_tasks")
        .update({ status: next })
        .eq("id", task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleCollapse = (projectId: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  // Group by project
  const grouped: GroupedProject[] = [];
  const seen = new Map<string, number>();
  for (const t of filtered) {
    const idx = seen.get(t.project_id);
    if (idx !== undefined) {
      grouped[idx].tasks.push(t);
    } else {
      seen.set(t.project_id, grouped.length);
      grouped.push({ project_id: t.project_id, project_name: t.project_name, tasks: [t] });
    }
  }

  const counts = {
    todo:        tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done:        tasks.filter(t => t.status === "done").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">Personal Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-900">My Work</h1>
        </div>
        <button
          onClick={fetchMyTasks}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-4">
        {(["todo", "in_progress", "done"] as const).map(s => {
          const cfg = STATUS_CFG[s];
          return (
            <div key={s} className={`bg-white border rounded-2xl px-5 py-4 flex items-center justify-between ${
              filter === s ? "border-indigo-400 shadow-sm shadow-indigo-100" : "border-slate-200"
            }`}>
              <div>
                <p className="text-2xl font-bold text-slate-900">{counts[s]}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{cfg.label}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                {cfg.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "todo", "in_progress", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All Tasks" : STATUS_CFG[f].label}
            {f !== "all" && <span className="ml-1.5 opacity-70">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {filter === "all" ? "No tasks assigned yet" : `No ${STATUS_CFG[filter].label} tasks`}
          </h2>
          <p className="text-sm text-slate-400">Your project manager will assign tasks to you through sprints.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.project_id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Project header */}
              <button
                onClick={() => toggleCollapse(group.project_id)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen size={16} className="text-indigo-500" />
                  <span className="font-semibold text-slate-800">{group.project_name}</span>
                  <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {collapsed.has(group.project_id)
                  ? <ChevronRight size={15} className="text-slate-400" />
                  : <ChevronDown size={15} className="text-slate-400" />
                }
              </button>

              {/* Tasks */}
              {!collapsed.has(group.project_id) && (
                <div className="divide-y divide-slate-50 border-t border-slate-100">
                  {group.tasks.map(task => {
                    const cfg = STATUS_CFG[task.status];
                    const isUpdating = updatingId === task.id;
                    return (
                      <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group">
                        {/* Status toggle button */}
                        <button
                          onClick={() => toggleStatus(task)}
                          disabled={isUpdating}
                          title={`Mark as ${STATUS_CFG[NEXT_STATUS[task.status]].label}`}
                          className="flex-shrink-0 transition-transform hover:scale-110 disabled:opacity-50"
                        >
                          {isUpdating
                            ? <Loader2 size={18} className="animate-spin text-indigo-400" />
                            : cfg.icon
                          }
                        </button>

                        {/* Task info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Flag size={10} className="text-slate-300" />
                            <span className="text-[11px] text-slate-400">{task.sprint_name}</span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
