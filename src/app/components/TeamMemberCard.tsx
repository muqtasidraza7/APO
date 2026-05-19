
"use client";

import React, { useState } from 'react';
import {
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    UserPlus,
    Trash2,
    ShieldAlert,
    ShieldCheck,
    Star,
    Crown,
    X,
    CheckCheck,
    Loader2,
    ListTodo,
    Flag,
    Clock,
    AlertTriangle,
    FolderOpen,
    Zap,
    Brain,
    Send,
    Pencil,
} from 'lucide-react';

// ── Types (mirrors team/page.tsx exports) ─────────────────────────────────────

interface MilestoneStatus {
    title: string;
    week: number;
    deadline: string;
    phase: "active" | "deferred" | "overdue" | "done";
    is_done: boolean;
    auto_completed: boolean;
    manually_completed: boolean;
    sprint_tasks_total: number;
    sprint_tasks_done: number;
    active_hours: number;
}

interface ProjectBreakdown {
    project_id: string;
    project_name: string;
    milestones: MilestoneStatus[];
    sprint_tasks_active: number;
    sprint_tasks_done: number;
}

interface WorkerPattern {
    id: string;
    pattern_type: 'task_incompatibility' | 'group_conflict';
    reason: string;
    severity: 'info' | 'caution' | 'blocker';
    task_type?: string;
    created_at: string;
}

interface TeamMember {
    id: string;
    user_id: string;
    full_name: string;
    email?: string;
    job_title?: string;
    avatar_url?: string;
    status: 'online' | 'away' | 'offline' | 'busy';
    skills: string[];
    capacity_hours_per_week: number;
    performance_score?: number;
    experience_level?: string | null;
    years_of_experience?: number | null;
    patterns?: WorkerPattern[];
    projects: ProjectBreakdown[];
    load: {
        active_hours: number;
        deferred_hours: number;
        capacity_monthly: number;
        utilization_pct: number;
    };
    totals: {
        milestones_done: number;
        milestones_total: number;
        sprint_tasks_done: number;
        sprint_tasks_total: number;
    };
}

interface TeamMemberCardProps {
    member: TeamMember;
    workspaceId: string;
    workspaceRole?: "owner" | "pm" | "member";
    callerIsOwner?: boolean;
    onAssignTask?: (memberId: string) => void;
    onRemove?: (member: TeamMember) => void;
    onChangeRole?: (member: TeamMember) => void;
    onEditProfile?: (member: TeamMember) => void;
    onPatternRecorded?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
    "from-indigo-400 to-violet-500",
    "from-emerald-400 to-teal-500",
    "from-rose-400 to-pink-500",
    "from-amber-400 to-orange-500",
    "from-sky-400 to-blue-500",
    "from-purple-400 to-fuchsia-500",
];

function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function phaseBadge(phase: MilestoneStatus["phase"]) {
    switch (phase) {
        case "done":     return "bg-green-100 text-green-700 border-green-200";
        case "active":   return "bg-indigo-100 text-indigo-700 border-indigo-200";
        case "overdue":  return "bg-red-100 text-red-700 border-red-200";
        case "deferred": return "bg-slate-100 text-slate-500 border-slate-200";
    }
}

function phaseLabel(phase: MilestoneStatus["phase"]) {
    switch (phase) {
        case "done":     return "Done";
        case "active":   return "Active";
        case "overdue":  return "Overdue";
        case "deferred": return "Deferred";
    }
}

function phaseIcon(phase: MilestoneStatus["phase"]) {
    switch (phase) {
        case "done":     return <CheckCircle2 size={10} />;
        case "active":   return <Clock size={10} />;
        case "overdue":  return <AlertTriangle size={10} />;
        case "deferred": return <Flag size={10} />;
    }
}

// ── Experience Tier Component ─────────────────────────────────────────────────

const EXP_LEVELS = ["Junior", "Mid-Level", "Senior", "Lead", "Executive"];

const EXP_CONFIG: Record<string, {
    gradient: string; dot: string; text: string; bg: string;
    border: string; shadow: string; icon: string;
}> = {
    "Junior":     { gradient: "from-slate-400 to-slate-600",    dot: "bg-slate-400",   text: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-200",  shadow: "",                      icon: "🌱" },
    "Mid-Level":  { gradient: "from-blue-400 to-blue-600",      dot: "bg-blue-500",    text: "text-blue-800",    bg: "bg-blue-50",    border: "border-blue-200",   shadow: "",                      icon: "⚡" },
    "Senior":     { gradient: "from-indigo-500 to-violet-600",  dot: "bg-indigo-500",  text: "text-indigo-800",  bg: "bg-indigo-50",  border: "border-indigo-300", shadow: "shadow-sm shadow-indigo-100", icon: "🔥" },
    "Lead":       { gradient: "from-violet-500 to-purple-700",  dot: "bg-violet-500",  text: "text-violet-900",  bg: "bg-violet-50",  border: "border-violet-300", shadow: "shadow-sm shadow-violet-100", icon: "💎" },
    "Executive":  { gradient: "from-amber-400 to-orange-500",   dot: "bg-amber-500",   text: "text-amber-900",   bg: "bg-amber-50",   border: "border-amber-300",  shadow: "shadow-sm shadow-amber-100",  icon: "👑" },
};

function ExperienceTier({ level, years }: { level?: string | null; years?: number | null }) {
    const lvl = level && EXP_CONFIG[level] ? level : null;
    if (!lvl && !years) return null;

    const safeLevel = lvl || "Mid-Level";
    const cfg = EXP_CONFIG[safeLevel];
    const idx = EXP_LEVELS.indexOf(safeLevel);

    return (
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.shadow}`}>
            <div className="flex items-center gap-2.5">
                {/* Gradient level badge */}
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex flex-col items-center justify-center shadow-sm flex-shrink-0`}>
                    <span className="text-white text-[13px] leading-none">{cfg.icon}</span>
                </div>
                <div>
                    <div className={`text-[11px] font-black uppercase tracking-widest leading-tight ${cfg.text}`}>
                        {safeLevel}
                    </div>
                    {years && years > 0 && (
                        <div className="text-[9px] text-slate-400 leading-tight mt-0.5">
                            {years} yr{years !== 1 ? "s" : ""} experience
                        </div>
                    )}
                </div>
            </div>

            {/* 5-pip level ladder */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {EXP_LEVELS.map((_, i) => (
                    <div
                        key={i}
                        className={`rounded-full transition-all ${
                            i < idx
                                ? `w-2 h-2 ${cfg.dot} opacity-40`
                                : i === idx
                                ? `w-3 h-3 ${cfg.dot} ring-2 ring-white ring-offset-1`
                                : "w-2 h-2 bg-slate-200"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeamMemberCard({
    member,
    workspaceId,
    workspaceRole,
    callerIsOwner,
    onAssignTask,
    onRemove,
    onChangeRole,
    onEditProfile,
    onPatternRecorded,
}: TeamMemberCardProps) {
    const [showPatterns, setShowPatterns] = useState(false);
    const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [showProjects, setShowProjects] = useState(false);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);

    // Report issue state
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportTaskType, setReportTaskType] = useState("");
    const [reportSeverity, setReportSeverity] = useState<"info" | "caution" | "blocker">("caution");
    const [reportingIssue, setReportingIssue] = useState(false);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [reportError, setReportError] = useState("");

    const getStatusColor = (s: string) => {
        if (s === 'online') return 'bg-green-500';
        if (s === 'busy')   return 'bg-red-500';
        if (s === 'away')   return 'bg-yellow-500';
        return 'bg-slate-400';
    };

    const getUtilizationLabel = (pct: number) => {
        if (pct >= 90) return { label: 'Overloaded', color: 'text-red-700 bg-red-50' };
        if (pct >= 75) return { label: 'High Load',  color: 'text-orange-700 bg-orange-50' };
        if (pct >= 50) return { label: 'Balanced',   color: 'text-green-700 bg-green-50' };
        return            { label: 'Available',  color: 'text-blue-700 bg-blue-50' };
    };

    const getActiveBarColor = (pct: number) => {
        if (pct >= 90) return 'bg-red-500';
        if (pct >= 75) return 'bg-orange-400';
        if (pct >= 50) return 'bg-green-500';
        return 'bg-indigo-500';
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-700 bg-green-50 border-green-200';
        if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-red-700 bg-red-50 border-red-200';
    };

    const getSeverityColor = (severity: string) => {
        if (severity === 'blocker') return 'text-red-700 bg-red-50 border-red-200';
        if (severity === 'caution') return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-blue-700 bg-blue-50 border-blue-200';
    };

    const handleResolve = async (patternId: string) => {
        setResolvingId(patternId);
        try {
            await fetch('/api/worker-patterns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: patternId, resolved: true }),
            });
            setResolvedIds(prev => new Set([...prev, patternId]));
        } finally {
            setResolvingId(null);
        }
    };

    const handleReportIssue = async () => {
        if (!reportReason.trim()) { setReportError("Please describe the issue."); return; }
        setReportingIssue(true);
        setReportError("");
        try {
            const res = await fetch("/api/worker-patterns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    pattern_type: "task_incompatibility",
                    member_id: member.id,
                    task_type: reportTaskType.trim() || null,
                    reason: reportReason.trim(),
                    severity: reportSeverity,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to record pattern");
            setReportSuccess(true);
            setReportReason("");
            setReportTaskType("");
            setReportSeverity("caution");
            onPatternRecorded?.();
            setTimeout(() => {
                setShowReport(false);
                setReportSuccess(false);
            }, 1800);
        } catch (err: any) {
            setReportError(err.message || "Failed. Please try again.");
        } finally {
            setReportingIssue(false);
        }
    };

    const { load, totals } = member;
    const utilizationStatus = getUtilizationLabel(load.utilization_pct);
    const performanceScore = member.performance_score ?? 100;
    const visiblePatterns = (member.patterns || []).filter(p => !resolvedIds.has(p.id));
    const hasPatterns = visiblePatterns.length > 0;
    const hasBlocker = visiblePatterns.some(p => p.severity === 'blocker');

    const deferredPct = load.capacity_monthly > 0
        ? Math.min((load.deferred_hours / load.capacity_monthly) * 100, 100)
        : 0;

    const severityConfig = {
        info:    { label: "Info",    desc: "AI notes this for context only",              active: "bg-blue-500 text-white border-blue-500" },
        caution: { label: "Caution", desc: "AI will warn but may still assign",           active: "bg-amber-500 text-white border-amber-500" },
        blocker: { label: "Blocker", desc: "AI will never assign this task type to them", active: "bg-red-600 text-white border-red-600" },
    };

    return (
        <div className={`bg-white border rounded-2xl p-6 hover:shadow-lg transition-all duration-200 relative overflow-visible ${
            hasBlocker ? 'border-red-200' : hasPatterns ? 'border-amber-200' : 'border-slate-200'
        }`}>

            {/* ── Pattern popup ─────────────────────────────────────────────── */}
            {showPatterns && hasPatterns && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPatterns(false)} />
                    <div className="absolute right-0 top-14 z-50 w-80 bg-white border border-amber-200 rounded-2xl shadow-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-amber-500" />
                                Recorded Patterns ({visiblePatterns.length})
                            </span>
                            <button onClick={() => setShowPatterns(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X size={14} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {visiblePatterns.map((p) => (
                                <div key={p.id} className={`px-3 py-2.5 rounded-lg border text-xs ${getSeverityColor(p.severity)}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="font-semibold uppercase tracking-wide">{p.severity}</span>
                                                {p.pattern_type === 'task_incompatibility' && p.task_type && (
                                                    <span className="opacity-70 truncate">· {p.task_type}</span>
                                                )}
                                                {p.pattern_type === 'group_conflict' && (
                                                    <span className="opacity-70">· Group Conflict</span>
                                                )}
                                            </div>
                                            <p className="leading-relaxed">{p.reason}</p>
                                        </div>
                                        <button
                                            onClick={() => handleResolve(p.id)}
                                            disabled={resolvingId === p.id}
                                            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-white/70 hover:bg-white border border-current rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                            {resolvingId === p.id
                                                ? <Loader2 size={10} className="animate-spin" />
                                                : <CheckCheck size={10} />
                                            }
                                            Resolve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-3">Resolving a pattern removes it from AI assignment logic.</p>
                    </div>
                </>
            )}

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                        {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.full_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" />
                        ) : (
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(member.full_name)} flex items-center justify-center border-2 border-white shadow-sm`}>
                                <span className="text-white font-bold text-sm tracking-wide">
                                    {getInitials(member.full_name)}
                                </span>
                            </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{member.full_name}</h3>
                            {workspaceRole === "owner" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 flex-shrink-0">
                                    <Crown size={9} /> Owner
                                </span>
                            )}
                            {workspaceRole === "pm" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0">
                                    <ShieldCheck size={9} /> PM
                                </span>
                            )}
                        </div>
                        {member.job_title && <p className="text-sm text-slate-500 truncate">{member.job_title}</p>}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${utilizationStatus.color}`}>
                        {utilizationStatus.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(performanceScore)}`}>
                            <Star size={10} />
                            {performanceScore}
                        </span>
                        {hasPatterns && (
                            <button
                                onClick={() => setShowPatterns(!showPatterns)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                                    hasBlocker
                                        ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                                        : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                }`}
                            >
                                <ShieldAlert size={10} />
                                {visiblePatterns.length}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Experience Tier ────────────────────────────────────────────── */}
            {(member.experience_level || member.years_of_experience) && (
                <div className="mb-4">
                    <ExperienceTier level={member.experience_level} years={member.years_of_experience} />
                </div>
            )}

            {/* ── Load bars ──────────────────────────────────────────────────── */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-600 font-medium">Active Load</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                        {Math.min(load.utilization_pct, 999)}%
                        <span className="text-slate-400 font-normal ml-1 text-xs">
                            ({load.active_hours}h / {load.capacity_monthly}h)
                        </span>
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${getActiveBarColor(load.utilization_pct)}`}
                        style={{ width: `${Math.min(load.utilization_pct, 100)}%` }}
                    />
                </div>

                {load.deferred_hours > 0 && (
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-400">Deferred</span>
                            <span className="text-slate-400 tabular-nums">{load.deferred_hours}h queued</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-slate-300 transition-all duration-500"
                                style={{ width: `${deferredPct}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Totals chips ───────────────────────────────────────────────── */}
            <div className="flex gap-2 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex-1">
                    <Flag size={13} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-indigo-700 tabular-nums">
                        {totals.milestones_done}/{totals.milestones_total}
                    </span>
                    <span className="text-xs text-indigo-500">Milestones</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg flex-1">
                    <ListTodo size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 tabular-nums">
                        {totals.sprint_tasks_done}/{totals.sprint_tasks_total}
                    </span>
                    <span className="text-xs text-slate-500">Sprint Tasks</span>
                </div>
            </div>

            {/* ── Skills ─────────────────────────────────────────────────────── */}
            {member.skills && member.skills.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1.5">
                        {member.skills.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100">
                                {skill}
                            </span>
                        ))}
                        {member.skills.length > 4 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">
                                +{member.skills.length - 4}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Project breakdown toggle ────────────────────────────────────── */}
            {member.projects.length > 0 && (
                <div className="mb-4 border-t border-slate-100 pt-3">
                    <button
                        onClick={() => setShowProjects(v => !v)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors group"
                    >
                        <span className="flex items-center gap-2">
                            <FolderOpen size={15} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            Projects ({member.projects.length})
                        </span>
                        {showProjects
                            ? <ChevronDown size={15} className="text-slate-400" />
                            : <ChevronRight size={15} className="text-slate-400" />
                        }
                    </button>

                    {showProjects && (
                        <div className="mt-3 space-y-2">
                            {member.projects.map((proj) => (
                                <div key={proj.project_id} className="border border-slate-100 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedProject(expandedProject === proj.project_id ? null : proj.project_id)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs font-semibold text-slate-800 truncate">{proj.project_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            <span className="text-xs text-slate-400 tabular-nums">
                                                {proj.sprint_tasks_done + proj.sprint_tasks_active > 0
                                                    ? `${proj.sprint_tasks_done}/${proj.sprint_tasks_done + proj.sprint_tasks_active} tasks`
                                                    : `${proj.milestones.length} milestones`}
                                            </span>
                                            {expandedProject === proj.project_id
                                                ? <ChevronDown size={13} className="text-slate-400" />
                                                : <ChevronRight size={13} className="text-slate-400" />
                                            }
                                        </div>
                                    </button>

                                    {expandedProject === proj.project_id && (
                                        <div className="divide-y divide-slate-50">
                                            {proj.milestones.length === 0 && (
                                                <p className="px-3 py-2 text-xs text-slate-400">No milestones assigned.</p>
                                            )}
                                            {proj.milestones.map((ms) => (
                                                <MilestoneRow key={ms.title} ms={ms} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Report Issue Panel ─────────────────────────────────────────── */}
            {showReport && (
                <div className="mb-3 rounded-2xl overflow-hidden border border-amber-300 shadow-md">
                    {/* Panel header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500">
                        <Brain size={14} className="text-white flex-shrink-0" />
                        <span className="text-white text-xs font-bold tracking-wide flex-1">Flag a Performance Pattern</span>
                        <span className="flex items-center gap-0.5 bg-white/20 backdrop-blur-sm text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-white/30 tracking-widest">
                            <Zap size={7} className="fill-white" /> AI MEMORY
                        </span>
                        <button onClick={() => { setShowReport(false); setReportError(""); }} className="ml-1 p-0.5 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={13} className="text-white" />
                        </button>
                    </div>

                    {reportSuccess ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-6 bg-emerald-50">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCheck size={20} className="text-emerald-600" />
                            </div>
                            <p className="text-sm font-bold text-emerald-800">Pattern recorded!</p>
                            <p className="text-xs text-emerald-600 text-center">AI will factor this into future assignments for {member.full_name}.</p>
                        </div>
                    ) : (
                        <div className="bg-amber-50/60 px-4 py-3 space-y-3">
                            <p className="text-[11px] text-amber-900 leading-relaxed">
                                Patterns are remembered by the AI and influence how it assigns tasks to{" "}
                                <span className="font-semibold">{member.full_name}</span> in future sprints.
                            </p>

                            {/* Task category */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Task Category <span className="font-normal text-slate-400">(optional)</span></label>
                                <input
                                    type="text"
                                    value={reportTaskType}
                                    onChange={e => setReportTaskType(e.target.value)}
                                    placeholder="e.g. Frontend, Database Design, DevOps…"
                                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
                                <textarea
                                    value={reportReason}
                                    onChange={e => setReportReason(e.target.value)}
                                    placeholder="e.g. Missed deadline, not specialized in React, workload conflict…"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                />
                            </div>

                            {/* Severity */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Impact on AI</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(["info", "caution", "blocker"] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setReportSeverity(s)}
                                            className={`py-1.5 rounded-lg text-[10px] font-bold capitalize border transition-all ${
                                                reportSeverity === s
                                                    ? severityConfig[s].active
                                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                                    <Zap size={9} className="text-amber-500" />
                                    {severityConfig[reportSeverity].desc}
                                </p>
                            </div>

                            {reportError && (
                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{reportError}</p>
                            )}

                            <button
                                onClick={handleReportIssue}
                                disabled={reportingIssue || !reportReason.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                                {reportingIssue
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <><Send size={12} /> Record &amp; Train AI</>
                                }
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Footer actions ─────────────────────────────────────────────── */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                    onClick={() => onAssignTask?.(member.id)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        load.utilization_pct >= 100
                            ? 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                    <UserPlus size={15} />
                    {load.utilization_pct >= 100 ? 'At Capacity' : 'Assign Task'}
                </button>

                {/* Report Issue — prominent feature button */}
                <button
                    onClick={() => { setShowReport(v => !v); setReportError(""); }}
                    title="Flag a performance pattern — AI will remember this"
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        showReport
                            ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-200'
                            : 'bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-700 border-amber-300 hover:border-amber-400'
                    }`}
                >
                    <ShieldAlert size={14} className={showReport ? 'text-white' : 'text-amber-500'} />
                    <span>Report</span>
                    {/* Pulsing AI badge */}
                    <span className="absolute -top-2 -right-1.5 flex items-center gap-0.5 bg-indigo-600 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm tracking-widest border border-white">
                        <Zap size={6} className="fill-white flex-shrink-0" />AI
                    </span>
                </button>

                {/* Change Role — only shown to PM/owner, not on owner cards */}
                {onChangeRole && workspaceRole !== "owner" && (
                    <button
                        onClick={() => onChangeRole(member)}
                        title="Change workspace role"
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium transition-colors"
                    >
                        <ShieldCheck size={15} />
                    </button>
                )}

                {/* Edit Profile — only shown to admins */}
                {onEditProfile && (
                    <button
                        onClick={() => onEditProfile(member)}
                        title="Edit work profile"
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Pencil size={15} />
                    </button>
                )}

                <button
                    onClick={() => onRemove?.(member)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 rounded-xl text-sm font-medium transition-colors"
                    title="Remove Member"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    );
}

// ── Milestone row sub-component (read-only) ───────────────────────────────────

function MilestoneRow({ ms }: { ms: MilestoneStatus }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${ms.is_done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {ms.title}
                </p>
                {ms.sprint_tasks_total > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                        {ms.sprint_tasks_done}/{ms.sprint_tasks_total} tasks
                    </p>
                )}
            </div>
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-medium flex-shrink-0 ${phaseBadge(ms.phase)}`}>
                {phaseIcon(ms.phase)}
                {phaseLabel(ms.phase)}
            </div>
        </div>
    );
}
