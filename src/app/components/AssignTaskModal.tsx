
"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import {
    X,
    Briefcase,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    Clock,
    Sparkles,
    FolderOpen,
    ListChecks,
    Trash2,
} from "lucide-react";

interface TeamMember {
    id: string;
    job_title?: string;
    skills: string[];
    capacity_hours_per_week: number;
    status: string;
    performance_score?: number;
    patterns?: {
        id: string;
        pattern_type: string;
        reason: string;
        severity: string;
        task_type?: string;
    }[];
    workload?: {
        utilization_percentage: number;
        estimated_hours_remaining: number;
        active_tasks: number;
    };
}

interface Milestone {
    title: string;
    week?: number;
    deliverable?: string;
    status?: string;
    assigned_member_ids?: string[];
}

interface Project {
    id: string;
    name: string;
    milestones: Milestone[];
}

interface ExistingAssignment {
    id: string;
    task_title: string;
    project_name: string;
    project_id: string;
    estimated_hours: number;
    source: "activity" | "ai_data"; // where the assignment came from
}

interface AssignTaskModalProps {
    member: TeamMember;
    workspaceId: string;
    onClose: () => void;
    onSuccess: (taskTitle: string, projectName: string) => void;
}

const AVAILABILITY_COLOR: Record<string, string> = {
    online: "text-green-600 bg-green-50 border-green-200",
    away: "text-yellow-600 bg-yellow-50 border-yellow-200",
    busy: "text-red-600 bg-red-50 border-red-200",
    offline: "text-slate-500 bg-slate-50 border-slate-200",
};
const AVAILABILITY_LABEL: Record<string, string> = {
    online: "Available now", away: "Away", busy: "Busy", offline: "Offline",
};

export default function AssignTaskModal({ member, workspaceId, onClose, onSuccess }: AssignTaskModalProps) {
    const supabase = createClient();

    const [tab, setTab] = useState<"assign" | "remove">("assign");
    const [projects, setProjects] = useState<Project[]>([]);
    const [existingAssignments, setExistingAssignments] = useState<ExistingAssignment[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
    const [estimatedHours, setEstimatedHours] = useState(8);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Report issue state
    const [reportIssueFor, setReportIssueFor] = useState<string | null>(null);
    const [issueReason, setIssueReason] = useState("");
    const [issueSeverity, setIssueSeverity] = useState<"info" | "caution" | "blocker">("caution");
    const [issueTaskType, setIssueTaskType] = useState("");
    const [reportingIssue, setReportingIssue] = useState(false);
    // 8.3 Fix: two-step confirm before removing a task
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    const utilization = member.workload?.utilization_percentage ?? 0;
    const isAtCapacity = utilization >= 100;

    useEffect(() => {
        
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id ?? null);
        });
        fetchProjects(); // chains into fetchExistingAssignments internally
    }, []);

    useEffect(() => {
        if (isAtCapacity) setTab("remove");
    }, [isAtCapacity]);

    const fetchProjects = async () => {
        const { data } = await supabase
            .from("projects")
            .select("id, name, ai_data")
            .eq("workspace_id", workspaceId)
            .eq("ai_status", "completed");

        const mapped: Project[] = (data || [])
            .map(p => ({
                id: p.id,
                name: p.name,
                // Preserve status and assigned_member_ids so Remove tab can use them
                milestones: (p.ai_data?.milestones || []).map((m: any) => ({
                    title: m.title,
                    week: m.week,
                    deliverable: m.deliverable,
                    status: m.status || "pending",
                    assigned_member_ids: m.assigned_member_ids || [],
                })) as Milestone[],
            }))
            .filter(p => p.milestones.length > 0);

        setProjects(mapped);
        setLoading(false);
        // Pass fresh list directly so fetchExistingAssignments has status info
        await fetchExistingAssignments(mapped);
    };

    const fetchExistingAssignments = async (currentProjects?: Project[]) => {
        const projectList = currentProjects || projects;

        // Build milestone status map from project ai_data
        // key: `${task_title}__${project_name}` → status
        const milestoneStatusMap: Record<string, string> = {};
        for (const p of projectList) {
            for (const ms of p.milestones) {
                milestoneStatusMap[`${ms.title}__${p.name}`] = ms.status || "pending";
            }
        }

        // ── Source 1: team_activity rows ─────────────────────────────────────
        const { data: activityData } = await supabase
            .from("team_activity")
            .select("id, description, metadata, created_at")
            .eq("team_member_id", member.id)
            .eq("activity_type", "task_assigned")
            .order("created_at", { ascending: false }); // newest first for dedup

        const seen = new Set<string>();
        const merged: ExistingAssignment[] = [];

        for (const r of activityData || []) {
            if (r.metadata?.status === "removed") continue;
            const title = r.metadata?.task_title || r.description;
            const projName = r.metadata?.project_name || "Unknown project";
            const projId = r.metadata?.project_id || "";
            const key = `${title}__${projName}`;

            // Skip completed milestones — nothing to remove
            if (milestoneStatusMap[key] === "completed") continue;
            if (seen.has(key)) continue; // dedup
            seen.add(key);

            merged.push({
                id: r.id,
                task_title: title,
                project_name: projName,
                project_id: projId,
                estimated_hours: r.metadata?.estimated_hours || 0,
                source: "activity",
            });
        }

        // ── Source 2: ai_data.milestones[].assigned_member_ids ───────────────
        for (const p of projectList) {
            for (const ms of p.milestones) {
                if (ms.status === "completed") continue; // skip done
                if (!(ms.assigned_member_ids || []).includes(member.id)) continue;
                const key = `${ms.title}__${p.name}`;
                if (seen.has(key)) continue; // already in list from team_activity
                seen.add(key);
                merged.push({
                    id: `aidata__${p.id}__${ms.title}`,
                    task_title: ms.title,
                    project_name: p.name,
                    project_id: p.id,
                    estimated_hours: 0,
                    source: "ai_data",
                });
            }
        }

        setExistingAssignments(merged);
    };

    const skillMatchScore = (milestoneTitle: string): number => {
        const title = milestoneTitle.toLowerCase();
        return (member.skills || []).filter(s =>
            title.includes(s.toLowerCase()) || s.toLowerCase().includes(title.split(" ")[0])
        ).length;
    };

    const handleAssign = async () => {
        if (!selectedProject || !selectedMilestone) { setError("Please choose a project and milestone."); return; }
        if (isAtCapacity) { setError("This member is at full capacity. Remove a task first."); return; }

        const alreadyAssigned = existingAssignments.some(
            a => a.task_title === selectedMilestone.title && a.project_name === selectedProject.name
        );
        if (alreadyAssigned) {
            setError(`"${selectedMilestone.title}" is already assigned to this member.`);
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            const { error: actErr } = await supabase.from("team_activity").insert({
                workspace_id: workspaceId,
                user_id: currentUserId,       
                team_member_id: member.id,    
                activity_type: "task_assigned",
                entity_type: "milestone",
                entity_id: selectedProject.id,
                description: `Assigned: ${selectedMilestone.title}`,
                metadata: {
                    task_title: selectedMilestone.title,
                    project_name: selectedProject.name,
                    project_id: selectedProject.id,
                    estimated_hours: estimatedHours,
                    notes: notes || null,
                    week: selectedMilestone.week || null,
                    status: "active",
                },
            });

            if (actErr) throw actErr;

            setSuccess(true);
            await fetchExistingAssignments(projects); // refresh list so new entry is visible
            setTimeout(() => {
                onSuccess(selectedMilestone.title, selectedProject.name);
            }, 1300);
        } catch (err: any) {
            setError(err.message || "Assignment failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (assignmentId: string) => {
        const assignment = existingAssignments.find(a => a.id === assignmentId);
        if (!assignment) return;
        try {
            setRemovingId(assignmentId);

            if (assignment.source === "ai_data") {
                // Remove this member from ai_data.milestones[].assigned_member_ids
                const project = projects.find(p => p.id === assignment.project_id);
                const milestone = project?.milestones.find(m => m.title === assignment.task_title);
                const currentIds: string[] = milestone?.assigned_member_ids || [];
                const newIds = currentIds.filter(id => id !== member.id);

                const res = await fetch("/api/projects/milestone-team", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId: assignment.project_id,
                        milestoneTitle: assignment.task_title,
                        memberIds: newIds,
                    }),
                });
                if (!res.ok) {
                    const d = await res.json();
                    throw new Error(d.error || "Failed to remove assignment");
                }
            } else {
                // Mark the team_activity row as removed
                const { data: existing } = await supabase
                    .from("team_activity")
                    .select("metadata")
                    .eq("id", assignmentId)
                    .single();

                const { error: upErr } = await supabase
                    .from("team_activity")
                    .update({ metadata: { ...(existing?.metadata || {}), status: "removed" } })
                    .eq("id", assignmentId);

                if (upErr) throw upErr;
            }

            setExistingAssignments(prev => prev.filter(a => a.id !== assignmentId));
            setReportIssueFor(null);
            setIssueReason("");
        } catch (err: any) {
            setError(err.message || "Failed to remove task.");
        } finally {
            setRemovingId(null);
        }
    };

    const handleReportIssue = async (assignment: ExistingAssignment) => {
        if (!issueReason.trim()) { setError("Please enter a reason for the issue."); return; }
        try {
            setReportingIssue(true);
            setError("");

            const response = await fetch("/api/worker-patterns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    pattern_type: "task_incompatibility",
                    member_id: member.id,
                    task_type: issueTaskType || assignment.task_title,
                    task_title: assignment.task_title,
                    project_id: null,
                    reason: issueReason,
                    severity: issueSeverity,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // Also remove the task
            await handleRemove(assignment.id);
            setReportIssueFor(null);
            setIssueReason("");
            setIssueTaskType("");
        } catch (err: any) {
            setError(err.message || "Failed to report issue.");
        } finally {
            setReportingIssue(false);
        }
    };

    const availabilityClass = AVAILABILITY_COLOR[member.status] || AVAILABILITY_COLOR.offline;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <ListChecks size={16} className="text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">Task Management</h2>
                        </div>
                        <p className="text-sm text-slate-500">
                            For{" "}
                            <span className="font-semibold text-slate-700">{member.job_title || "Team Member"}</span>
                            {" · "}
                            <span className={`font-medium ${utilization >= 90 ? "text-red-600" : utilization >= 50 ? "text-orange-500" : "text-green-600"}`}>
                                {utilization.toFixed(0)}% utilized
                            </span>
                            {" · "}
                            <span className="text-slate-500">{member.capacity_hours_per_week}h/week capacity</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="px-6 pt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Capacity used</span>
                        <span className="font-semibold">{Math.min(utilization, 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                        <div
                            className={`h-full rounded-full transition-all ${utilization >= 100 ? "bg-red-500" : utilization >= 75 ? "bg-orange-400" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                    </div>
                    {isAtCapacity && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-red-700">
                            <AlertCircle size={15} />
                            Member is at full capacity. Remove a task before assigning a new one.
                        </div>
                    )}
                </div>

                <div className="flex border-b border-slate-100 px-6">
                    <button
                        onClick={() => setTab("assign")}
                        disabled={isAtCapacity}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${tab === "assign"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            }`}
                    >
                        Assign New Task
                    </button>
                    <button
                        onClick={() => setTab("remove")}
                        className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${tab === "remove"
                            ? "border-red-500 text-red-600"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        Remove Task
                        {existingAssignments.length > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                                {existingAssignments.length}
                            </span>
                        )}
                    </button>
                </div>

                {success ? (
                    <div className="p-14 text-center">
                        <CheckCircle2 size={52} className="text-green-500 mx-auto mb-4" />
                        <p className="text-xl font-bold text-slate-900">Task Assigned!</p>
                        <p className="text-slate-500 mt-1 text-sm">
                            "{selectedMilestone?.title}" assigned to {member.job_title || "team member"}.
                        </p>
                    </div>
                ) : (
                    <div className="p-6 space-y-5">

                        {tab === "assign" && (
                            <>
                                
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${availabilityClass}`}>
                                        <Clock size={10} /> {AVAILABILITY_LABEL[member.status] || member.status}
                                    </span>
                                    {member.skills.slice(0, 4).map(s => (
                                        <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">{s}</span>
                                    ))}
                                    {member.skills.length > 4 && <span className="text-xs text-slate-400">+{member.skills.length - 4}</span>}
                                </div>

                                {member.patterns && member.patterns.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                                        <p className="font-bold flex items-center gap-1.5"><AlertCircle size={12} /> Performance Patterns Detected</p>
                                        {member.patterns.map(p => (
                                            <p key={p.id}>• {p.reason} ({p.severity})</p>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <FolderOpen size={14} className="text-indigo-500" /> Pick a Project
                                    </label>
                                    {loading ? (
                                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                                            <Loader2 size={13} className="animate-spin" /> Loading...
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                            No completed projects found. Run AI analysis on a project first.
                                        </p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {projects.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => { setSelectedProject(p); setSelectedMilestone(null); }}
                                                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-left text-sm transition-all ${selectedProject?.id === p.id
                                                        ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-900"
                                                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                                                        }`}
                                                >
                                                    <span>{p.name}</span>
                                                    <span className="text-xs text-slate-400">{p.milestones.length} milestones</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedProject && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <Briefcase size={14} className="text-indigo-500" /> Pick a Milestone
                                            <span className="font-normal text-slate-400 text-xs">✨ = skill match</span>
                                        </label>
                                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                            {[...selectedProject.milestones]
                                                .sort((a, b) => skillMatchScore(b.title) - skillMatchScore(a.title))
                                                .map((m, i) => {
                                                    const score = skillMatchScore(m.title);
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => setSelectedMilestone(m)}
                                                            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${selectedMilestone?.title === m.title
                                                                ? "border-indigo-500 bg-indigo-50"
                                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                                }`}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-sm text-slate-900">{m.title}</span>
                                                                    {score > 0 && (
                                                                        <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                                                                            <Sparkles size={10} /> {score > 1 ? "Strong match" : "Match"}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {m.deliverable && (
                                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{m.deliverable}</p>
                                                                )}
                                                            </div>
                                                            {m.week && <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">Wk {m.week}</span>}
                                                            <ChevronRight size={13} className={`flex-shrink-0 mt-0.5 ${selectedMilestone?.title === m.title ? "text-indigo-500" : "text-slate-300"}`} />
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {selectedMilestone && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Estimated Hours</label>
                                            <input
                                                type="number"
                                                value={estimatedHours}
                                                onChange={e => setEstimatedHours(Number(e.target.value))}
                                                min={1} max={200}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                                            <input
                                                type="text"
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                placeholder="Optional..."
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                                        <AlertCircle size={15} /> {error}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAssign}
                                        disabled={submitting || !selectedProject || !selectedMilestone || isAtCapacity}
                                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {submitting ? <><Loader2 size={15} className="animate-spin" /> Assigning...</> : <><CheckCircle2 size={15} /> Confirm</>}
                                    </button>
                                </div>
                            </>
                        )}

                        {tab === "remove" && (
                            <div className="space-y-3">
                                {existingAssignments.length === 0 ? (
                                    <p className="text-center text-slate-400 py-8">No active assignments to remove.</p>
                                ) : (
                                    existingAssignments.map(a => (
                                        <div key={a.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="flex items-center justify-between p-4 hover:bg-slate-50">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 text-sm truncate">{a.task_title}</p>
                                                    <p className="text-xs text-slate-500">{a.project_name} · {a.estimated_hours}h estimated</p>
                                                </div>
                                                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                                    <button
                                                        onClick={() => setReportIssueFor(reportIssueFor === a.id ? null : a.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                                            reportIssueFor === a.id
                                                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                                                        }`}
                                                    >
                                                        <AlertCircle size={12} />
                                                        Report Issue
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirmRemoveId === a.id) {
                                                                handleRemove(a.id);
                                                                setConfirmRemoveId(null);
                                                            } else {
                                                                setConfirmRemoveId(a.id);
                                                            }
                                                        }}
                                                        disabled={removingId === a.id}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all border ${
                                                            confirmRemoveId === a.id
                                                                ? "bg-red-600 text-white border-red-700 animate-pulse"
                                                                : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                                        }`}
                                                    >
                                                        {removingId === a.id
                                                            ? <Loader2 size={12} className="animate-spin" />
                                                            : <Trash2 size={12} />
                                                        }
                                                        {confirmRemoveId === a.id ? "Confirm?" : "Remove"}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Report Issue Form */}
                                            {reportIssueFor === a.id && (
                                                <div className="border-t border-amber-200 bg-amber-50/50 p-4 space-y-3">
                                                    <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                                        <AlertCircle size={12} />
                                                        Record a Performance Pattern
                                                    </p>
                                                    <p className="text-xs text-amber-700">This will be remembered by the AI during future assignments.</p>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Task Category (optional)</label>
                                                        <input
                                                            type="text"
                                                            value={issueTaskType}
                                                            onChange={e => setIssueTaskType(e.target.value)}
                                                            placeholder="e.g. Frontend Development, Database Design..."
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                                                        <textarea
                                                            value={issueReason}
                                                            onChange={e => setIssueReason(e.target.value)}
                                                            placeholder="e.g. Did not complete — not specialized in React / Missed deadline due to workload conflict..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                                                        <div className="flex gap-2">
                                                            {(["info", "caution", "blocker"] as const).map(s => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => setIssueSeverity(s)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                                                                        issueSeverity === s
                                                                            ? s === 'blocker' ? 'bg-red-600 text-white border-red-600'
                                                                            : s === 'caution' ? 'bg-amber-500 text-white border-amber-500'
                                                                            : 'bg-blue-500 text-white border-blue-500'
                                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {issueSeverity === 'blocker' ? '🔴 AI will never assign this person to this task type' :
                                                             issueSeverity === 'caution' ? '🟡 AI will warn but may still assign' :
                                                             '🔵 AI notes this for context only'}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setReportIssueFor(null); setIssueReason(""); setIssueTaskType(""); }}
                                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleReportIssue(a)}
                                                            disabled={reportingIssue || !issueReason.trim()}
                                                            className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                                                        >
                                                            {reportingIssue ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                                                            Record & Remove Task
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                {error && (
                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                                        <AlertCircle size={15} /> {error}
                                    </div>
                                )}
                                <button onClick={onClose} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
