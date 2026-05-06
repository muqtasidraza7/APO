"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../../utils/supabase/client";
import {
  Zap, Plus, ArrowRight, Calendar, Target, CheckCircle2,
  Clock, PlayCircle, X, Loader2, AlertTriangle, ArrowLeft, ListChecks
} from "lucide-react";

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: "planning" | "active" | "completed";
  created_at: string;
  task_count?: number;
  done_count?: number;
}

const STATUS_CONFIG = {
  planning: { label: "Planning", icon: <Clock size={12} />, cls: "bg-slate-100 text-slate-600" },
  active:   { label: "Active",   icon: <PlayCircle size={12} />, cls: "bg-blue-100 text-blue-700" },
  completed:{ label: "Completed",icon: <CheckCircle2 size={12} />, cls: "bg-green-100 text-green-700" },
};

export default function SprintsPage() {
  const { id: projectId } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projectName, setProjectName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });

  useEffect(() => {
    const load = async () => {
      const { data: project } = await supabase.from("projects").select("name, workspace_id").eq("id", projectId).single();
      if (!project) { router.push("/dashboard"); return; }
      setProjectName(project.name);
      setWorkspaceId(project.workspace_id);

      const { data: sprintRows } = await supabase
        .from("sprints").select("*").eq("project_id", projectId).order("created_at", { ascending: false });

      if (sprintRows && sprintRows.length > 0) {
        const { data: taskRows } = await supabase
          .from("sprint_tasks").select("sprint_id, status").eq("project_id", projectId);

        const enriched = sprintRows.map((s: any) => {
          const st = (taskRows || []).filter((t: any) => t.sprint_id === s.id);
          return { ...s, task_count: st.length, done_count: st.filter((t: any) => t.status === "done").length };
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
    if (!form.name || !form.start_date || !form.end_date) { setError("Name, start date and end date are required."); return; }
    setCreating(true); setError("");
    const res = await fetch("/api/sprints/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, workspaceId, ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setCreating(false); return; }
    setShowModal(false);
    setForm({ name: "", goal: "", start_date: "", end_date: "" });
    setSprints(prev => [{ ...data.sprint, task_count: 0, done_count: 0 }, ...prev]);
    setCreating(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <Link href={`/dashboard/projects/${projectId}`} className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to {projectName}
          </Link>
          <p className="text-sm font-medium text-slate-400">Agile Planning</p>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ListChecks size={28} className="text-indigo-500" /> Sprints
          </h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} /> New Sprint
        </button>
      </div>

      {sprints.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
            <Zap size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Sprints Yet</h2>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first sprint and let the AI populate it with tasks from your project milestones.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary inline-flex items-center gap-2">
            <Plus size={18} /> Create First Sprint
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sprints.map(sprint => {
            const cfg = STATUS_CONFIG[sprint.status];
            const progress = sprint.task_count ? Math.round((sprint.done_count! / sprint.task_count) * 100) : 0;
            const start = new Date(sprint.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const end = new Date(sprint.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <div key={sprint.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-indigo-200 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {mounted && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={12} /> {start} – {end}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{sprint.name}</h3>
                    {sprint.goal && (
                      <p className="text-sm text-slate-500 mt-1 flex items-start gap-1.5">
                        <Target size={14} className="mt-0.5 flex-shrink-0 text-indigo-400" /> {sprint.goal}
                      </p>
                    )}
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{sprint.done_count}/{sprint.task_count} tasks done</span>
                        <span className="font-semibold text-indigo-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/projects/${projectId}/sprints/${sprint.id}`}
                    className="flex-shrink-0 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                    Open Board <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Sprint Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create Sprint</h2>
              <button onClick={() => { setShowModal(false); setError(""); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sprint Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Sprint 1 — Foundation" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sprint Goal</label>
                <textarea value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))}
                  placeholder="What should this sprint achieve?" rows={2}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">End Date *</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{error}</p>}
              <button onClick={handleCreate} disabled={creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                {creating ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Plus size={16} /> Create Sprint</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
