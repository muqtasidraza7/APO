"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, Users, RefreshCw, Loader2, CheckCircle2,
  XCircle, AlertCircle, Briefcase, Clock, Undo2, Save, BookOpen,
  History, Plus, X, Check, ChevronDown, ChevronUp, Zap, Award,
  BarChart2, ArrowRight, Star, Info, Edit2, Trash2, GitCompare,
  TrendingUp, AlertTriangle, UserPlus,
} from "lucide-react";
import {
  runSmartAllocation, confirmAllocation, rejectAllocation,
  undoAllocation, saveCurrentAsScenario, activateScenario,
  deleteScenario, updateMilestoneMembers,
} from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
  skills: string[];
  capacity_hours_per_week: number;
  hourly_rate: number | null;
  performance_score: number | null;
  status: string;
}

interface Assignment {
  id: string;
  task_name: string;
  week_number: number;
  match_reason: string;
  resource_id: string;
  member: TeamMember | null;
}

interface MilestoneGroup {
  title: string;
  week: number;
  members: { id: string; member: TeamMember | null; match_reason: string }[];
}

interface Scenario {
  id: string;
  name: string;
  source: string;
  note: string | null;
  created_by_name: string | null;
  assignments: any[];
  created_at: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  note: string | null;
  performed_by_name: string | null;
  assignment_count: number;
  assignments_before: any[];
  assignments_after: any[];
  created_at: string;
}

interface AllocationData {
  projectName: string;
  workspaceId: string;
  milestones: any[];
  assignments: Assignment[];
  teamMembers: TeamMember[];
  scenarios: Scenario[];
  history: HistoryEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function resolveIds(text: string, memberMap: Record<string, string>): string {
  return text.replace(UUID_RE, id => memberMap[id] ?? id);
}

function groupAssignments(assignments: Assignment[]): MilestoneGroup[] {
  const map = new Map<string, MilestoneGroup>();
  for (const a of assignments) {
    const key = a.task_name;
    if (!map.has(key)) map.set(key, { title: a.task_name, week: a.week_number, members: [] });
    map.get(key)!.members.push({ id: a.resource_id, member: a.member, match_reason: a.match_reason });
  }
  return Array.from(map.values()).sort((a, b) => a.week - b.week);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    ai_run: "AI Run",
    manual_edit: "Manual Edit",
    scenario_activated: "Scenario Activated",
    undone: "Undone",
  };
  return map[action] || action;
}

function actionColor(action: string) {
  const map: Record<string, string> = {
    ai_run: "bg-indigo-100 text-indigo-700 border-indigo-200",
    manual_edit: "bg-amber-100 text-amber-700 border-amber-200",
    scenario_activated: "bg-violet-100 text-violet-700 border-violet-200",
    undone: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return map[action] || "bg-slate-100 text-slate-500 border-slate-200";
}

// ── Scenario diff (side-by-side compare) ─────────────────────────────────────

function ScenarioDiff({ a, b, teamMembers }: { a: Scenario; b: Scenario; teamMembers: TeamMember[] }) {
  const memberMap: Record<string, TeamMember> = {};
  for (const m of teamMembers) memberMap[m.id] = m;

  const milestoneNames = Array.from(new Set([
    ...(a.assignments as any[]).map((x: any) => x.task_name),
    ...(b.assignments as any[]).map((x: any) => x.task_name),
  ])).sort();

  function getNames(scenario: Scenario, title: string): string[] {
    return (scenario.assignments as any[])
      .filter((x: any) => x.task_name === title)
      .map((x: any) => memberMap[x.resource_id]?.full_name || memberMap[x.resource_id]?.job_title || "Unknown");
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider">Milestone</th>
            <th className="text-left px-4 py-2.5 font-bold text-indigo-600 uppercase tracking-wider">{a.name}</th>
            <th className="text-left px-4 py-2.5 font-bold text-violet-600 uppercase tracking-wider">{b.name}</th>
            <th className="text-center px-4 py-2.5 font-bold text-slate-400 uppercase tracking-wider">Changed?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {milestoneNames.map(title => {
            const aN = getNames(a, title);
            const bN = getNames(b, title);
            const changed = JSON.stringify(aN.sort()) !== JSON.stringify(bN.sort());
            return (
              <tr key={title} className={changed ? "bg-amber-50/40" : ""}>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{title}</td>
                <td className="px-4 py-2.5 text-slate-600">{aN.join(", ") || <span className="text-slate-300 italic">Unassigned</span>}</td>
                <td className="px-4 py-2.5 text-slate-600">{bN.join(", ") || <span className="text-slate-300 italic">Unassigned</span>}</td>
                <td className="px-4 py-2.5 text-center">
                  {changed
                    ? <span className="text-[10px] font-black text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">DIFF</span>
                    : <span className="text-slate-300 text-[10px]">—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AllocationClient() {
  const { id: projectId } = useParams() as { id: string };

  const [data, setData] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"current" | "scenarios" | "history">("current");
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);

  // AI run state
  const [aiPhase, setAiPhase] = useState<"idle" | "running" | "confirm" | "confirming" | "rejecting">("idle");
  const [aiCount, setAiCount] = useState(0);
  const [aiNote, setAiNote] = useState("");
  const [showAiNote, setShowAiNote] = useState(false);

  // Undo
  const [undoLoading, setUndoLoading] = useState(false);

  // Save scenario modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Manual edit
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  // Scenario actions
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/allocation/data?project_id=${projectId}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // ── AI run ──────────────────────────────────────────────────────────────────

  const handleRunAI = async () => {
    setAiPhase("running");
    const result = await runSmartAllocation(projectId, aiNote || undefined);
    if (result?.error) {
      showToast(result.error, "error");
      setAiPhase("idle");
    } else {
      setAiCount(result.assigned_count ?? 0);
      setAiPhase("confirm");
      setAiNote("");
      setShowAiNote(false);
      await load();
    }
  };

  const handleConfirm = async () => {
    setAiPhase("confirming");
    const result = await confirmAllocation(projectId);
    if (result?.error) {
      showToast(result.error, "error");
      setAiPhase("confirm");
    } else {
      showToast(`✓ ${result.confirmed_count} assignments confirmed`);
      setAiPhase("idle");
      await load();
    }
  };

  const handleReject = async () => {
    setAiPhase("rejecting");
    await rejectAllocation(projectId);
    showToast("Allocation discarded");
    setAiPhase("idle");
    await load();
  };

  // ── Undo ────────────────────────────────────────────────────────────────────

  const handleUndo = async () => {
    setUndoLoading(true);
    const result = await undoAllocation(projectId);
    setUndoLoading(false);
    if (result?.error) showToast(result.error, "error");
    else { showToast("Allocation rolled back"); await load(); }
  };

  // ── Save scenario ───────────────────────────────────────────────────────────

  const handleSaveScenario = async () => {
    if (!saveName.trim()) return;
    setSaveLoading(true);
    const result = await saveCurrentAsScenario(projectId, saveName, saveNote || undefined);
    setSaveLoading(false);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast("Scenario saved");
      setShowSaveModal(false);
      setSaveName(""); setSaveNote("");
      await load();
    }
  };

  // ── Manual edit ─────────────────────────────────────────────────────────────

  const startEdit = (group: MilestoneGroup) => {
    setEditingMilestone(group.title);
    setEditMemberIds(group.members.map(m => m.id));
  };

  const handleSaveEdit = async (group: MilestoneGroup) => {
    if (!data) return;
    setEditLoading(true);
    const result = await updateMilestoneMembers(
      projectId, data.workspaceId, group.title, group.week, editMemberIds
    );
    setEditLoading(false);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast(`${group.title} updated`);
      setEditingMilestone(null);
      await load();
    }
  };

  // ── Activate / delete scenario ───────────────────────────────────────────────

  const handleActivateScenario = async (sc: Scenario) => {
    setActivatingId(sc.id);
    const result = await activateScenario(projectId, sc.id);
    setActivatingId(null);
    if (result?.error) showToast(result.error, "error");
    else {
      showToast(`"${sc.name}" is now active`);
      setTab("current");
      await load();
    }
  };

  const handleDeleteScenario = async (sc: Scenario) => {
    setDeletingId(sc.id);
    await deleteScenario(sc.id, projectId);
    setDeletingId(null);
    showToast("Scenario deleted");
    await load();
  };

  // ── Derived stats ────────────────────────────────────────────────────────────

  const grouped = data ? groupAssignments(data.assignments) : [];
  const memberNameMap: Record<string, string> = {};
  (data?.teamMembers ?? []).forEach(m => { memberNameMap[m.id] = m.full_name || m.job_title || m.id; });
  const assignedMilestoneCount = grouped.length;
  const totalMilestones = data?.milestones?.length ?? 0;
  const unassigned = totalMilestones - assignedMilestoneCount;
  const involvedMemberIds = new Set(data?.assignments.map(a => a.resource_id) ?? []);
  const involvedCount = involvedMemberIds.size;

  // Per-member workload: how many milestones
  const memberLoad: Record<string, number> = {};
  for (const g of grouped) for (const m of g.members) memberLoad[m.id] = (memberLoad[m.id] || 0) + 1;
  const mostLoaded = data?.teamMembers
    .filter(m => memberLoad[m.id])
    .sort((a, b) => (memberLoad[b.id] || 0) - (memberLoad[a.id] || 0))[0];

  const canUndo = (data?.history ?? []).some(h => h.action !== "undone");

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-red-500">
        <AlertCircle size={18} className="mr-2" /> Failed to load allocation data.
      </div>
    );
  }

  const hasAssignments = data.assignments.length > 0;

  // ── Compare mode ────────────────────────────────────────────────────────────

  const compareScenarios = showCompare && compareIds.length === 2
    ? data.scenarios.filter(s => compareIds.includes(s.id))
    : null;

  // ── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-14">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 border shadow-xl rounded-2xl px-5 py-3.5 flex items-center gap-3 animate-in slide-in-from-bottom-4 ${
          toast.type === "error"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-white border-green-200 text-slate-900"
        }`}>
          {toast.type === "error"
            ? <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            : <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-3"
        >
          <ArrowLeft size={13} /> Back to Project Blueprint
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Resource Allocation</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              AI-driven staffing for <span className="font-semibold text-slate-600">"{data.projectName}"</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Undo */}
            {canUndo && hasAssignments && (
              <button
                onClick={handleUndo}
                disabled={undoLoading}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {undoLoading ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}
                Undo
              </button>
            )}

            {/* Save current as scenario */}
            {hasAssignments && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Save size={13} /> Save Scenario
              </button>
            )}

            {/* AI Run */}
            {aiPhase === "idle" && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRunAI}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  <Sparkles size={14} />
                  {hasAssignments ? "Re-run AI" : "Auto-Assign Team"}
                </button>
                <button
                  onClick={() => setShowAiNote(!showAiNote)}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50"
                  title="Add a note for this run"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            )}

            {aiPhase === "running" && (
              <button disabled className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl opacity-70">
                <Loader2 size={14} className="animate-spin" /> Matching Skills…
              </button>
            )}
          </div>
        </div>

        {/* AI note input */}
        {showAiNote && aiPhase === "idle" && (
          <div className="mt-3 flex gap-2 max-w-md">
            <input
              value={aiNote}
              onChange={e => setAiNote(e.target.value)}
              placeholder="Reason for re-running (e.g. Alice left the team)…"
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        )}

        {/* Confirm / Reject banner */}
        {(aiPhase === "confirm" || aiPhase === "confirming" || aiPhase === "rejecting") && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Sparkles size={15} className="text-amber-700" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">AI proposed {aiCount} assignment{aiCount !== 1 ? "s" : ""}</p>
                <p className="text-xs text-slate-500 mt-0.5">Review the plan below. Accept to lock in workload, or reject to discard.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReject}
                disabled={aiPhase !== "confirm"}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-white text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {aiPhase === "rejecting" ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Reject
              </button>
              <button
                onClick={handleConfirm}
                disabled={aiPhase !== "confirm"}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {aiPhase === "confirming" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {aiPhase === "confirming" ? "Applying…" : "Accept Team"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Milestones Covered",
            value: `${assignedMilestoneCount}/${totalMilestones}`,
            icon: <BarChart2 size={15} className="text-indigo-500" />,
            sub: unassigned > 0 ? `${unassigned} unassigned` : "All covered",
            subColor: unassigned > 0 ? "text-amber-600" : "text-emerald-600",
          },
          {
            label: "Team Members Involved",
            value: involvedCount,
            icon: <Users size={15} className="text-violet-500" />,
            sub: `of ${data.teamMembers.length} in workspace`,
            subColor: "text-slate-400",
          },
          {
            label: "Most Loaded",
            value: mostLoaded ? (mostLoaded.full_name || mostLoaded.job_title || "—") : "—",
            icon: <TrendingUp size={15} className="text-amber-500" />,
            sub: mostLoaded ? `${memberLoad[mostLoaded.id]} milestone${memberLoad[mostLoaded.id] !== 1 ? "s" : ""}` : "No assignments yet",
            subColor: "text-slate-400",
          },
          {
            label: "Saved Scenarios",
            value: data.scenarios.length,
            icon: <BookOpen size={15} className="text-emerald-500" />,
            sub: data.history.length > 0 ? `${data.history.length} history entries` : "No history yet",
            subColor: "text-slate-400",
          },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
              {s.icon}
            </div>
            <div className="text-lg font-black text-slate-900 truncate">{s.value}</div>
            <p className={`text-[10px] mt-0.5 ${s.subColor}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["current", "scenarios", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "current" ? "Current Allocation" : t === "scenarios" ? `Scenarios (${data.scenarios.length})` : `History (${data.history.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB: Current Allocation ─────────────────────────────────────────── */}
      {tab === "current" && (
        <div className="space-y-4">

          {!hasAssignments ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5">
                <Users size={28} className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">No Allocation Yet</h2>
              <p className="text-sm text-slate-400 max-w-sm">
                Click <span className="font-semibold text-indigo-600">Auto-Assign Team</span> above to let the AI match your team's skills to milestones, or use a saved scenario.
              </p>
            </div>
          ) : (
            <>
              {/* Per-member utilization sidebar could go here — embedded inline instead */}
              {/* Milestone-grouped cards */}
              <div className="space-y-3">
                {grouped.map(group => {
                  const isEditing = editingMilestone === group.title;
                  return (
                    <div key={group.title} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-indigo-200 transition-colors">
                      <div className="px-5 py-4">
                        <div className="flex items-start gap-4">
                          {/* Week badge */}
                          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Week</span>
                            <span className="text-lg font-black text-slate-700">{group.week}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Milestone title */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <h3 className="font-black text-slate-900 text-base leading-tight">{group.title}</h3>
                              {!isEditing && (
                                <button
                                  onClick={() => startEdit(group)}
                                  className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex-shrink-0"
                                >
                                  <Edit2 size={10} /> Override
                                </button>
                              )}
                            </div>

                            {isEditing ? (
                              /* Manual edit panel */
                              <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
                                <p className="text-xs font-bold text-indigo-700">Select members for this milestone</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {data.teamMembers.map(m => {
                                    const selected = editMemberIds.includes(m.id);
                                    return (
                                      <button
                                        key={m.id}
                                        onClick={() => setEditMemberIds(prev =>
                                          selected ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                        )}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                          selected
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                        }`}
                                      >
                                        <span className={`w-5 h-5 rounded-full text-[8px] font-black flex items-center justify-center flex-shrink-0 ${selected ? "bg-white/20 text-white" : avatarColor(m.id)}`}>
                                          {initials(m.full_name || m.job_title)}
                                        </span>
                                        {m.full_name || m.job_title}
                                        {selected && <X size={9} />}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveEdit(group)}
                                    disabled={editLoading || editMemberIds.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                  >
                                    {editLoading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingMilestone(null)}
                                    className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  {editMemberIds.length === 0 && (
                                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                      <AlertTriangle size={9} /> Select at least one member
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Member chips */
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                  {group.members.map(({ id, member }) => (
                                    <div
                                      key={id}
                                      className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-default"
                                    >
                                      <div className={`w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${avatarColor(id)}`}>
                                        {initials(member?.full_name || member?.job_title || "?")}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-800 whitespace-nowrap">
                                          {member?.full_name || member?.job_title || "Unknown"}
                                        </div>
                                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                          {member?.job_title || ""}
                                          {member?.capacity_hours_per_week ? ` · ${member.capacity_hours_per_week}h/wk` : ""}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {/* AI Rationale panel */}
                                {group.members[0]?.match_reason && (
                                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <Sparkles size={10} className="text-indigo-400 flex-shrink-0" />
                                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">AI Rationale</span>
                                    </div>
                                    <p className="text-[11px] text-indigo-800 leading-relaxed whitespace-pre-line">
                                      {resolveIds(group.members[0].match_reason, memberNameMap)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Unassigned milestones notice */}
              {unassigned > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">
                      {unassigned} milestone{unassigned !== 1 ? "s" : ""} not covered
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      These milestones exist in your AI plan but have no assigned team members.
                      Use <span className="font-semibold">Re-run AI</span> or add a manual assignment above.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.milestones
                        .filter((m: any) => !grouped.some(g => g.title.toLowerCase() === (m.title || "").toLowerCase()))
                        .map((m: any) => (
                          <span key={m.title} className="text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg">
                            {m.title}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Team utilization summary */}
              {data.teamMembers.filter(m => memberLoad[m.id]).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart2 size={15} className="text-indigo-500" /> Team Utilization
                  </h3>
                  <div className="space-y-3">
                    {data.teamMembers
                      .filter(m => memberLoad[m.id])
                      .sort((a, b) => (memberLoad[b.id] || 0) - (memberLoad[a.id] || 0))
                      .map(m => {
                        const milestoneCount = memberLoad[m.id] || 0;
                        const usedHrs = milestoneCount * 20;
                        const capHrs = m.capacity_hours_per_week || 40;
                        const pct = Math.min(100, Math.round((usedHrs / capHrs) * 100));
                        const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-indigo-500";
                        const textColor = pct > 90 ? "text-red-600" : pct > 70 ? "text-amber-600" : "text-indigo-600";
                        return (
                          <div key={m.id} className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${avatarColor(m.id)}`}>
                              {initials(m.full_name || m.job_title)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-700 truncate">{m.full_name || m.job_title}</span>
                                <span className={`text-[11px] font-black ml-2 flex-shrink-0 ${textColor}`}>{pct}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400 w-20 text-right flex-shrink-0">
                              {milestoneCount} task{milestoneCount !== 1 ? "s" : ""} · {capHrs}h cap
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Scenarios ──────────────────────────────────────────────────── */}
      {tab === "scenarios" && (
        <div className="space-y-4">
          {data.scenarios.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-14 flex flex-col items-center text-center">
              <BookOpen size={32} className="text-slate-300 mb-4" />
              <h3 className="text-base font-black text-slate-700 mb-1">No Saved Scenarios</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Run an AI allocation and click <span className="font-semibold">Save Scenario</span> to snapshot it for later comparison.
              </p>
            </div>
          ) : (
            <>
              {/* Compare toggle */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{data.scenarios.length} saved scenario{data.scenarios.length !== 1 ? "s" : ""}</p>
                {data.scenarios.length >= 2 && (
                  <button
                    onClick={() => {
                      setCompareIds([]);
                      setShowCompare(!showCompare);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-colors ${
                      showCompare
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <GitCompare size={12} /> Compare Mode
                  </button>
                )}
              </div>

              {/* Compare picker */}
              {showCompare && !compareScenarios && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-indigo-700 mb-3">Select two scenarios to compare side by side</p>
                  <div className="flex flex-wrap gap-2">
                    {data.scenarios.map(sc => (
                      <button
                        key={sc.id}
                        onClick={() => setCompareIds(prev =>
                          prev.includes(sc.id)
                            ? prev.filter(id => id !== sc.id)
                            : prev.length < 2 ? [...prev, sc.id] : [prev[1], sc.id]
                        )}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          compareIds.includes(sc.id)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        {sc.name}
                      </button>
                    ))}
                  </div>
                  {compareIds.length === 2 && (
                    <button
                      onClick={() => setShowCompare(true)}
                      className="mt-3 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700"
                    >
                      Show Comparison
                    </button>
                  )}
                </div>
              )}

              {/* Side-by-side diff */}
              {compareScenarios && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitCompare size={14} className="text-indigo-500" />
                      <span className="font-black text-slate-900 text-sm">Scenario Comparison</span>
                    </div>
                    <button onClick={() => { setShowCompare(false); setCompareIds([]); }} className="p-1 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <ScenarioDiff a={compareScenarios[0]} b={compareScenarios[1]} teamMembers={data.teamMembers} />
                </div>
              )}

              {/* Scenario cards */}
              <div className="space-y-3">
                {data.scenarios.map(sc => {
                  const assignmentsByTitle = new Map<string, string[]>();
                  for (const a of (sc.assignments as any[])) {
                    if (!assignmentsByTitle.has(a.task_name)) assignmentsByTitle.set(a.task_name, []);
                    assignmentsByTitle.get(a.task_name)!.push(a.resource_id);
                  }
                  const uniqueMembers = new Set((sc.assignments as any[]).map((a: any) => a.resource_id));
                  return (
                    <div key={sc.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-slate-900 text-base">{sc.name}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              sc.source === "ai"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {sc.source === "ai" ? "AI" : "Manual"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {fmtDate(sc.created_at)}
                            {sc.created_by_name && ` · by ${sc.created_by_name}`}
                          </p>
                          {sc.note && <p className="text-xs text-slate-500 italic mt-1">"{sc.note}"</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleDeleteScenario(sc)}
                            disabled={deletingId === sc.id}
                            className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                            title="Delete scenario"
                          >
                            {deletingId === sc.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          </button>
                          <button
                            onClick={() => handleActivateScenario(sc)}
                            disabled={activatingId === sc.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {activatingId === sc.id ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                            Make Active
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 mb-3">
                        <span className="flex items-center gap-1"><Briefcase size={10} /> {assignmentsByTitle.size} milestones</span>
                        <span className="flex items-center gap-1"><Users size={10} /> {uniqueMembers.size} members</span>
                        <span className="flex items-center gap-1"><BarChart2 size={10} /> {sc.assignments.length} total assignments</span>
                      </div>

                      {/* Preview: first 3 milestones */}
                      <div className="space-y-1">
                        {Array.from(assignmentsByTitle.entries()).slice(0, 3).map(([title, memberIds]) => {
                          const names = memberIds.map(id => {
                            const m = data.teamMembers.find(tm => tm.id === id);
                            return m?.full_name || m?.job_title || id.slice(0, 6);
                          });
                          return (
                            <div key={title} className="flex items-center gap-2 text-[11px]">
                              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full flex-shrink-0" />
                              <span className="font-semibold text-slate-700 truncate">{title}</span>
                              <span className="text-slate-400">→ {names.join(", ")}</span>
                            </div>
                          );
                        })}
                        {assignmentsByTitle.size > 3 && (
                          <p className="text-[10px] text-slate-400 ml-4">+{assignmentsByTitle.size - 3} more milestones…</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: History ────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-3">
          {data.history.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-14 flex flex-col items-center text-center">
              <History size={32} className="text-slate-300 mb-4" />
              <h3 className="text-base font-black text-slate-700 mb-1">No History Yet</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Every AI run, manual edit, and undo will be recorded here.
              </p>
            </div>
          ) : (
            data.history.map((entry, i) => {
              const isLatest = i === 0 && entry.action !== "undone";
              const beforeCount = entry.assignments_before?.length ?? 0;
              const afterCount = entry.assignment_count ?? 0;
              const delta = afterCount - beforeCount;
              return (
                <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${actionColor(entry.action)}`}>
                          {actionLabel(entry.action)}
                        </span>
                        {isLatest && (
                          <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse inline-block" />
                            LATEST
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">{fmtDate(entry.created_at)}</span>
                      </div>

                      <p className="text-sm font-semibold text-slate-800">
                        {entry.performed_by_name || "Unknown"}
                      </p>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 flex-wrap">
                        <span>{afterCount} assignment{afterCount !== 1 ? "s" : ""} after</span>
                        {delta !== 0 && (
                          <span className={delta > 0 ? "text-emerald-600" : "text-red-600"}>
                            {delta > 0 ? `+${delta}` : delta} vs before
                          </span>
                        )}
                      </div>

                      {entry.note && (
                        <p className="text-xs text-slate-500 italic mt-1.5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                          "{entry.note}"
                        </p>
                      )}
                    </div>

                    {isLatest && entry.action !== "undone" && canUndo && (
                      <button
                        onClick={handleUndo}
                        disabled={undoLoading}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {undoLoading ? <Loader2 size={11} className="animate-spin" /> : <Undo2 size={11} />}
                        Undo This
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Save Scenario Modal ──────────────────────────────────────────────── */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Save size={16} className="text-indigo-500" /> Save Scenario
              </h2>
              <button onClick={() => setShowSaveModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={15} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Name *</label>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="e.g. Sprint 2 plan, Pre-hire allocation…"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Note <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea
                  value={saveNote}
                  onChange={e => setSaveNote(e.target.value)}
                  placeholder="Why are you saving this snapshot?"
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveScenario}
                disabled={saveLoading || !saveName.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saveLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
