"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Loader2,
  Target,
  ChevronDown,
  Zap,
  ListChecks,
  UserCheck,
  Users,
  X,
} from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string;
  job_title: string;
}

interface Milestone {
  id?: string;
  title: string;
  deliverable: string;
  success_criteria?: string;
  week?: number;
  week_number?: number;
  status?: "pending" | "in_progress" | "completed" | "blocked";
  completion_percentage?: number;
  assigned_member_ids?: string[];
}

interface SprintStatus {
  status: string;
  taskCount: number;
  assignedCount: number;
  doneCount: number;
  sprintName: string;
}

interface MilestoneListProps {
  milestones: Milestone[];
  projectId: string;
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  editable?: boolean;
  sprintStatuses?: Record<number, SprintStatus>;
  teamMembers?: TeamMember[];
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
    icon: Circle,
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    itemHover: "hover:bg-slate-50 text-slate-700",
    dot: "bg-slate-300",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: Clock,
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    itemHover: "hover:bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    itemHover: "hover:bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    value: "blocked",
    label: "Blocked",
    icon: AlertCircle,
    badge: "bg-red-50 text-red-700 border-red-200",
    itemHover: "hover:bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];

function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function getNodeStyle(status: string) {
  switch (status) {
    case "completed": return { dot: "bg-emerald-500", ring: "ring-emerald-100", pulse: false };
    case "in_progress": return { dot: "bg-indigo-500", ring: "ring-indigo-100", pulse: true };
    case "blocked": return { dot: "bg-red-500", ring: "ring-red-100", pulse: false };
    default: return { dot: "bg-slate-300", ring: "ring-slate-100", pulse: false };
  }
}

function getAccentColor(status: string) {
  switch (status) {
    case "completed": return "bg-emerald-500";
    case "in_progress": return "bg-indigo-500";
    case "blocked": return "bg-red-500";
    default: return "bg-slate-200";
  }
}

function getLineColor(status: string) {
  switch (status) {
    case "completed": return "bg-emerald-200";
    case "in_progress": return "bg-indigo-200";
    default: return "bg-slate-200";
  }
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

// ── Status Dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({
  status,
  milestoneId,
  loading,
  onSelect,
  isAuto,
}: {
  status: StatusValue;
  milestoneId: string;
  loading: boolean;
  onSelect: (id: string, status: string) => void;
  isAuto: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = getStatusConfig(status);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-shrink-0 flex items-center gap-1.5" ref={ref}>
      {isAuto && (
        <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
          <Zap size={8} /> Auto
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={loading}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide transition-all select-none ${cfg.badge} ${loading ? "opacity-50 cursor-not-allowed" : "hover:opacity-75 cursor-pointer"}`}
      >
        {loading
          ? <Loader2 size={10} className="animate-spin" />
          : <cfg.icon size={10} />
        }
        {cfg.label}
        {!loading && <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 min-w-[148px] animate-in fade-in slide-in-from-top-1 duration-150">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (opt.value !== status) onSelect(milestoneId, opt.value);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-colors ${opt.itemHover}`}
            >
              <opt.icon size={13} />
              {opt.label}
              {status === opt.value && (
                <CheckCircle2 size={11} className="ml-auto text-indigo-500 opacity-70" />
              )}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1 px-3 pb-1">
            <p className="text-[10px] text-slate-400">Manual override</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sprint context bar ────────────────────────────────────────────────────────
function SprintContextBar({ sprint }: { sprint: SprintStatus }) {
  const taskPct = sprint.taskCount > 0 ? Math.round((sprint.doneCount / sprint.taskCount) * 100) : 0;
  const barColor = taskPct === 100 ? "bg-emerald-500" : taskPct > 0 ? "bg-indigo-500" : "bg-slate-300";

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Zap size={10} className="text-indigo-400" />
          <span className="truncate max-w-[140px]">{sprint.sprintName}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          {sprint.taskCount === 0 ? (
            <span className="text-slate-400">No tasks added yet</span>
          ) : (
            <>
              <span className="flex items-center gap-1 text-slate-500">
                <ListChecks size={10} />
                {sprint.doneCount}/{sprint.taskCount} done
              </span>
              {sprint.assignedCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <UserCheck size={10} />
                  {sprint.assignedCount} assigned
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {sprint.taskCount > 0 && (
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${taskPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MilestoneList({
  milestones,
  projectId,
  onMilestoneUpdate,
  editable = true,
  sprintStatuses = {},
  teamMembers,
}: MilestoneListProps) {
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>(
    [...milestones]
      .sort((a, b) => (a.week ?? a.week_number ?? 0) - (b.week ?? b.week_number ?? 0))
      .map((m, idx) => ({
        ...m,
        id: m.id || `temp-${idx}`,
        status: (sprintStatuses[idx]?.status as any) || m.status || "pending",
        completion_percentage: m.completion_percentage || 0,
      }))
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [autoIndexes, setAutoIndexes] = useState<Set<number>>(
    new Set(Object.keys(sprintStatuses).map(Number))
  );
  const [teamModalIdx, setTeamModalIdx] = useState<number | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sync when sprint statuses load asynchronously — preserve sort order
  useEffect(() => {
    if (Object.keys(sprintStatuses).length === 0) return;
    setLocalMilestones((prev) => {
      const updated = prev.map((m, idx) => {
        const derived = sprintStatuses[idx];
        if (!derived) return m;
        return { ...m, status: derived.status as any };
      });
      return [...updated].sort((a, b) => (a.week ?? a.week_number ?? 0) - (b.week ?? b.week_number ?? 0));
    });
    setAutoIndexes(new Set(Object.keys(sprintStatuses).map(Number)));
  }, [sprintStatuses]);

  const openTeamModal = (idx: number) => {
    setSelectedTeamIds(localMilestones[idx]?.assigned_member_ids || []);
    setSaveError("");
    setTeamModalIdx(idx);
  };

  const handleSaveTeam = async () => {
    if (teamModalIdx === null) return;
    const ms = localMilestones[teamModalIdx];
    if (!ms) return;
    setSavingTeam(true);

    const prevIds = ms.assigned_member_ids;
    setLocalMilestones((prev) =>
      prev.map((m, idx) =>
        idx === teamModalIdx ? { ...m, assigned_member_ids: selectedTeamIds } : m
      )
    );

    try {
      const res = await fetch("/api/projects/milestone-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, milestoneTitle: ms.title, memberIds: selectedTeamIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save team assignment");
      setTeamModalIdx(null);
      setSaveError("");
    } catch (err: any) {
      setSaveError(err.message || "Failed to save. Please try again.");
      setLocalMilestones((prev) =>
        prev.map((m, idx) =>
          idx === teamModalIdx ? { ...m, assigned_member_ids: prevIds } : m
        )
      );
    }
    setSavingTeam(false);
  };

  const total = localMilestones.length;
  const completedCount = localMilestones.filter((m) => m.status === "completed").length;
  const inProgressCount = localMilestones.filter((m) => m.status === "in_progress").length;
  const blockedCount = localMilestones.filter((m) => m.status === "blocked").length;
  const pendingCount = total - completedCount - inProgressCount - blockedCount;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // milestoneKey is milestone.title (always present, unlike .id which AI milestones lack)
  const handleStatusChange = async (milestoneKey: string, newStatus: string) => {
    if (loadingId) return;
    const milestoneIdx = localMilestones.findIndex(
      (m) => (m.title || m.id) === milestoneKey
    );
    const milestone = localMilestones[milestoneIdx];
    if (!milestone) return;

    setAutoIndexes((prev) => { const n = new Set(prev); n.delete(milestoneIdx); return n; });

    setLoadingId(milestoneKey);
    const updates: Partial<Milestone> = {
      status: newStatus as any,
      completion_percentage: newStatus === "completed" ? 100 : newStatus === "in_progress" ? 50 : 0,
    };

    setLocalMilestones((prev) =>
      prev.map((m) => ((m.title || m.id) === milestoneKey ? { ...m, ...updates } : m))
    );

    if (onMilestoneUpdate) {
      try {
        await onMilestoneUpdate(milestoneKey, updates);
      } catch {
        setLocalMilestones((prev) =>
          prev.map((m) => ((m.title || m.id) === milestoneKey ? milestone : m))
        );
      }
    }
    setLoadingId(null);
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
            <Target size={15} className="text-indigo-600" />
          </div>
          Milestones
        </h2>
        <div className="flex items-center gap-3 text-xs font-semibold">
          {completedCount > 0 && <span className="flex items-center gap-1 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completedCount} Done</span>}
          {inProgressCount > 0 && <span className="flex items-center gap-1 text-indigo-600"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />{inProgressCount} Active</span>}
          {blockedCount > 0 && <span className="flex items-center gap-1 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{blockedCount} Blocked</span>}
          {pendingCount > 0 && <span className="flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{pendingCount} Pending</span>}
        </div>
      </div>

      {/* Sprint auto-status notice */}
      {Object.keys(sprintStatuses).length > 0 && (
        <div className="mb-5 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
          <Zap size={12} className="flex-shrink-0" />
          <span>Milestone statuses are auto-derived from sprint tasks. Use the dropdown to override manually.</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 font-medium">Overall completion</span>
          <span className="text-xs font-bold text-slate-700">{progress}% · {completedCount}/{total}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      {localMilestones.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Target size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-sm">No milestones yet</p>
        </div>
      ) : (
        <div>
          {localMilestones.map((milestone, index) => {
            const weekNum = milestone.week || milestone.week_number || index + 1;
            const status = milestone.status || "pending";
            const node = getNodeStyle(status);
            const accent = getAccentColor(status);
            const lineColor = getLineColor(status);
            const isLast = index === localMilestones.length - 1;
            const isLoading = loadingId === (milestone.title || milestone.id);
            const sprintCtx = sprintStatuses[index];
            const isAuto = autoIndexes.has(index);
            const assignedMembers = teamMembers
              ? teamMembers.filter((m) => (milestone.assigned_member_ids || []).includes(m.id))
              : [];

            return (
              <div key={milestone.id} className="flex gap-0">
                {/* Week badge */}
                <div className="w-12 flex-shrink-0 pt-[18px] text-right pr-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    W{weekNum}
                  </span>
                </div>

                {/* Node + line */}
                <div className="flex flex-col items-center w-6 flex-shrink-0">
                  <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-[18px] z-10 ring-4 ${node.dot} ${node.ring} ${node.pulse ? "animate-pulse" : ""}`} />
                  {!isLast && <div className={`w-px flex-1 mt-1 min-h-[24px] ${lineColor}`} />}
                </div>

                {/* Card */}
                <div className={`flex-1 pl-4 ${isLast ? "pb-2" : "pb-5"}`}>
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm relative hover:shadow-md transition-shadow duration-200">
                    {/* Left accent */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${accent}`} />

                    <div className="p-5 pl-6">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className={`font-bold text-base leading-snug flex-1 ${status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {milestone.title}
                        </h3>
                        {editable ? (
                          <StatusDropdown
                            status={status as StatusValue}
                            milestoneId={milestone.title || milestone.id || String(index)}
                            loading={isLoading}
                            onSelect={handleStatusChange}
                            isAuto={isAuto}
                          />
                        ) : (
                          <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border flex-shrink-0 ${getStatusConfig(status).badge}`}>
                            {status.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      {/* Deliverable */}
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">{milestone.deliverable}</p>

                      {/* Blocked callout */}
                      {status === "blocked" && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
                          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-600 font-semibold">This milestone is blocked — update the status when resolved</p>
                        </div>
                      )}

                      {/* Completed callout */}
                      {status === "completed" && (
                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mb-3">
                          <CheckCircle2 size={13} /> Milestone completed
                        </p>
                      )}

                      {/* Team assignment row */}
                      {teamMembers && teamMembers.length > 0 && (
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users size={12} className="text-slate-400 flex-shrink-0" />
                            {assignedMembers.length > 0 ? (
                              <>
                                <div className="flex -space-x-1.5">
                                  {assignedMembers.slice(0, 5).map((m) => (
                                    <div
                                      key={m.id}
                                      title={m.full_name || m.job_title}
                                      className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[7px] font-bold flex items-center justify-center border border-white flex-shrink-0"
                                    >
                                      {getInitials(m.full_name || m.job_title)}
                                    </div>
                                  ))}
                                  {assignedMembers.length > 5 && (
                                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[7px] font-bold flex items-center justify-center border border-white">
                                      +{assignedMembers.length - 5}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 truncate">
                                  {assignedMembers.length} member{assignedMembers.length !== 1 ? "s" : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-amber-600 font-medium">No team assigned</span>
                            )}
                          </div>
                          {editable && (
                            <button
                              onClick={() => openTeamModal(index)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 flex-shrink-0 transition-colors"
                            >
                              <UserCheck size={11} />
                              {assignedMembers.length > 0 ? "Edit Team" : "Assign Team"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Sprint context */}
                      {sprintCtx && <SprintContextBar sprint={sprintCtx} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Assignment Modal */}
      {teamModalIdx !== null && teamMembers && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Assign Team to Milestone</h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">
                  {localMilestones[teamModalIdx]?.title}
                </p>
              </div>
              <button
                onClick={() => setTeamModalIdx(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-72 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No team members in workspace</p>
              ) : (
                <div className="space-y-1">
                  {teamMembers.map((m) => {
                    const checked = selectedTeamIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${checked ? "bg-indigo-50 border-indigo-100" : "hover:bg-slate-50 border-transparent"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamIds((prev) => [...prev, m.id]);
                            } else {
                              setSelectedTeamIds((prev) => prev.filter((id) => id !== m.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                          {getInitials(m.full_name || m.job_title)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{m.full_name || m.job_title}</p>
                          <p className="text-xs text-slate-400 truncate">{m.job_title}</p>
                        </div>
                        {checked && <CheckCircle2 size={14} className="text-indigo-500 flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {saveError && (
              <div className="px-6 py-2 bg-red-50 border-t border-red-100">
                <p className="text-xs text-red-600 font-medium">{saveError}</p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => { setTeamModalIdx(null); setSaveError(""); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTeam}
                disabled={savingTeam}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {savingTeam
                  ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  : <><UserCheck size={14} /> Save Team</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
