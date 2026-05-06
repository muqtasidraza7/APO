"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/utils/supabase/client";
import {
  ArrowLeft, Sparkles, Plus, X, Loader2, CheckCircle2, Clock,
  PlayCircle, Eye, Target, Calendar, Zap, AlertTriangle, Flag,
  TrendingUp, ListChecks,
  TrendingDown, Play
} from "lucide-react";

interface SprintTask {
  id: string;
  title: string;
  description: string | null;
  story_points: number;
  status: "backlog" | "in_progress" | "in_review" | "done";
  priority: "high" | "medium" | "low";
  assigned_to: string | null;
  assigned_member?: { job_title: string } | null;
  created_by_ai: boolean;
  completed_at: string | null;
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
}

const COLUMNS = [
  { id: "backlog", label: "Backlog", icon: <Clock size={14} />, color: "bg-slate-100", border: "border-slate-300", dot: "bg-slate-400" },
  { id: "in_progress", label: "In Progress", icon: <PlayCircle size={14} />, color: "bg-blue-50", border: "border-blue-300", dot: "bg-blue-500" },
  { id: "in_review", label: "In Review", icon: <Eye size={14} />, color: "bg-amber-50", border: "border-amber-300", dot: "bg-amber-500" },
  { id: "done", label: "Done", icon: <CheckCircle2 size={14} />, color: "bg-green-50", border: "border-green-300", dot: "bg-green-500" },
] as const;

const PRIORITY_CFG = {
  high: { label: "High", cls: "bg-red-100 text-red-700" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700" },
  low: { label: "Low", cls: "bg-slate-100 text-slate-600" },
};

const SP_OPTIONS = [1, 2, 3, 5, 8, 13];

export default function SprintBoardPage() {
  const { id: projectId, sid: sprintId } = useParams() as { id: string; sid: string };
  const router = useRouter();
  const supabase = createClient();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; job_title: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [retroNotes, setRetroNotes] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addColumn, setAddColumn] = useState<string>("backlog");
  const [addForm, setAddForm] = useState({ title: "", description: "", story_points: 3, priority: "medium", assigned_to: "" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    const { data: sprintData } = await supabase.from("sprints").select("*").eq("id", sprintId).single();
    if (!sprintData) { router.push(`/dashboard/projects/${projectId}/sprints`); return; }
    setSprint(sprintData);

    const { data: taskData } = await supabase
      .from("sprint_tasks")
      .select("*, assigned_member:team_members(job_title)")
      .eq("sprint_id", sprintId)
      .order("created_at", { ascending: true });

    setTasks((taskData as any[]) || []);

    const { data: teamData } = await supabase
      .from("team_members")
      .select("id, full_name, job_title, user_id")
      .eq("workspace_id", sprintData.workspace_id);
    setTeamMembers(teamData || []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", sprintData.workspace_id).single();
      const isOwner = ws?.owner_id === user.id;
      
      const userMember = teamData?.find(m => m.user_id === user.id);
      const isPM = userMember?.job_title?.toLowerCase().includes("project manager") || 
                   userMember?.job_title?.toLowerCase().includes("pm");
      
      setIsAdmin(isOwner || !!isPM);
    }
    setLoading(false);
  }, [sprintId, projectId]);

  useEffect(() => { load(); setMounted(true); }, [load]);

  // Drag and Drop handlers
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const onDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!dragTaskId) return;
    const task = tasks.find(t => t.id === dragTaskId);
    if (!task || task.status === colId) { setDragTaskId(null); return; }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: colId as any } : t));
    setDragTaskId(null);

    const res = await fetch("/api/sprints/task-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: dragTaskId, status: colId, projectId }),
    });
    if (!res.ok) {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === dragTaskId ? { ...t, status: task.status } : t));
      showToast("Failed to update task status");
    } else {
      if (colId === "done") showToast(`✅ "${task.title}" completed!`);
    }
  };

  const handleAIPopulate = async () => {
    if (!sprint) return;
    setIsAILoading(true);
    const res = await fetch("/api/sprints/ai-populate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId, projectId, workspaceId: sprint.workspace_id }),
    });
    const data = await res.json();
    setIsAILoading(false);
    if (!res.ok) { showToast(`AI Error: ${data.error}`); return; }
    showToast(`✨ AI added ${data.count} tasks to the backlog!`);
    load();
  };

  const handleAddTask = async () => {
    if (!addForm.title.trim()) { setAddError("Title is required."); return; }
    if (!sprint) return;
    setAddLoading(true); setAddError("");
    const res = await fetch("/api/sprints/task-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sprintId,
        projectId,
        workspaceId: sprint.workspace_id,
        title: addForm.title,
        description: addForm.description || null,
        story_points: addForm.story_points,
        priority: addForm.priority,
        assigned_to: addForm.assigned_to || null,
      }),
    });
    const data = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(data.error); return; }
    setTasks(prev => [...prev, data.task]);
    setShowAddModal(false);
    setAddForm({ title: "", description: "", story_points: 3, priority: "medium", assigned_to: "" });
    showToast("Task added!");
  };

  const handleCloseSprint = async () => {
    if (!sprint) return;
    setIsClosing(true);
    const res = await fetch("/api/sprints/close", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId: sprint.id, retrospective_notes: retroNotes }),
    });
    setIsClosing(false);
    if (res.ok) {
      setSprint(prev => prev ? { ...prev, status: "completed" } : prev);
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
      setSprint(prev => prev ? { ...prev, status: "active" } : prev);
      showToast("Sprint started!");
    }
  };

  if (loading || !sprint) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );

  const totalPoints = tasks.reduce((s, t) => s + t.story_points, 0);
  const donePoints = tasks.filter(t => t.status === "done").reduce((s, t) => s + t.story_points, 0);
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, Math.min(durationDays, Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))));
  const idealPct = durationDays > 0 ? Math.round((daysElapsed / durationDays) * 100) : 0;

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
          <Link href={`/dashboard/projects/${projectId}/sprints`} className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> All Sprints
          </Link>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{sprint.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sprint.status === "completed" ? "bg-green-100 text-green-700" :
                sprint.status === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
              }`}>{sprint.status}</span>
          </div>
          {sprint.goal && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Target size={13} className="text-indigo-400" /> {sprint.goal}
            </p>
          )}
          {mounted && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(sprint.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
              {new Date(sprint.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" "}({durationDays} days)
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/dashboard/projects/${projectId}/sprints/${sprintId}/burndown`}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors border border-indigo-100">
            <TrendingDown size={15} /> View Burndown
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {sprint.status !== "completed" && (
                <button
                  onClick={handleAIPopulate}
                  disabled={isAILoading}
                  className="bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-violet-100 transition-all"
                >
                  {isAILoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {isAILoading ? "Generating..." : "AI Populate"}
                </button>
              )}
              <button 
                onClick={() => { setAddColumn("backlog"); setShowAddModal(true); }}
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
          { label: "Total Tasks", value: tasks.length, color: "text-slate-900" },
          { label: "Story Points", value: `${donePoints}/${totalPoints}`, color: "text-indigo-600" },
          { label: "Completion", value: `${progressPct}%`, color: progressPct >= idealPct ? "text-green-600" : "text-red-500" },
          { label: "Day", value: `${daysElapsed}/${durationDays}`, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Burndown bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold flex items-center gap-1"><TrendingUp size={12} className="text-indigo-400" /> Sprint Burndown</span>
          {mounted && <span>Ideal: <span className="font-bold text-indigo-500">{idealPct}%</span> done by today</span>}
        </div>
        <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          {mounted && <div className="absolute h-full bg-indigo-100 rounded-full" style={{ width: `${idealPct}%` }} />}
          <div className="absolute h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>0%</span>
          {mounted && (
            <span className={progressPct >= idealPct ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
              {progressPct >= idealPct ? "✓ On Track" : `⚠ ${idealPct - progressPct}% behind`}
            </span>
          )}
          <span>100%</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          const colPoints = colTasks.reduce((s, t) => s + t.story_points, 0);
          return (
            <div key={col.id} className={`rounded-2xl border-2 ${col.border} ${col.color} flex flex-col min-h-[500px]`}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.id)}>
              {/* Column Header */}
              <div className="p-4 border-b border-current border-opacity-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="font-semibold text-sm text-slate-700">{col.label}</span>
                    <span className="bg-white/80 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full border border-current border-opacity-20">
                      {colTasks.length}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{colPoints}sp</span>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-3 flex-1 space-y-3">
                {colTasks.map(task => (
                  <div key={task.id}
                    draggable={sprint.status !== "completed"}
                    onDragStart={e => onDragStart(e, task.id)}
                    className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-200 transition-all select-none ${dragTaskId === task.id ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_CFG[task.priority].cls}`}>
                        {PRIORITY_CFG[task.priority].label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {task.created_by_ai && <Sparkles size={11} className="text-indigo-400" />}
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{task.story_points}sp</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug mb-2">{task.title}</p>
                    {task.description && <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{task.description}</p>}
                    {task.assigned_member && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                          {task.assigned_member.job_title?.[0] || "?"}
                        </div>
                        <span className="text-xs text-slate-500 truncate">{task.assigned_member.job_title}</span>
                      </div>
                    )}
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
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-indigo-500" /> Add Task</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(""); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Title *</label>
                <input type="text" value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="What needs to be done?" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Description</label>
                <textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details..." rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Story Points</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SP_OPTIONS.map(sp => (
                      <button key={sp} type="button" onClick={() => setAddForm(p => ({ ...p, story_points: sp }))}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${addForm.story_points === sp ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Priority</label>
                  <select value={addForm.priority} onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              {teamMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign To</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    value={addForm.assigned_to}
                    onChange={e => setAddForm(p => ({ ...p, assigned_to: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.job_title})</option>
                    ))}
                  </select>
                </div>
              )}
              {addError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{addError}</p>}
              <button onClick={handleAddTask} disabled={addLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                {addLoading ? <><Loader2 size={15} className="animate-spin" /> Adding...</> : <><Plus size={15} /> Add Task</>}
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
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><CheckCircle2 size={20} className="text-indigo-600" /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Close Sprint</h2>
                  <p className="text-xs text-slate-500">{tasks.filter(t => t.status === "done").length}/{tasks.length} tasks completed</p>
                </div>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-indigo-100 rounded-xl transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Retrospective Notes (optional)</label>
                <textarea value={retroNotes} onChange={e => setRetroNotes(e.target.value)}
                  placeholder="What went well? What could be improved?" rows={4}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              </div>
              {tasks.filter(t => t.status !== "done").length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{tasks.filter(t => t.status !== "done").length} incomplete task(s) will remain in the backlog.</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowCloseModal(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleCloseSprint} disabled={isClosing}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                  {isClosing ? <><Loader2 size={14} className="animate-spin" /> Closing...</> : "Close Sprint"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
