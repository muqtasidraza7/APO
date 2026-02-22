
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
    estimated_hours: number;
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

    const utilization = member.workload?.utilization_percentage ?? 0;
    const isAtCapacity = utilization >= 100;

    useEffect(() => {
        
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id ?? null);
        });
        Promise.all([fetchProjects(), fetchExistingAssignments()]);
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
                milestones: (p.ai_data?.milestones || []) as Milestone[],
            }))
            .filter(p => p.milestones.length > 0);

        setProjects(mapped);
        setLoading(false);
    };

    const fetchExistingAssignments = async () => {
        const { data } = await supabase
            .from("team_activity")
            .select("id, description, metadata")
            .eq("team_member_id", member.id)
            .eq("activity_type", "task_assigned");

        const mapped: ExistingAssignment[] = (data || [])
            .filter(r => r.metadata?.status !== "removed")
            .map(r => ({
                id: r.id,
                task_title: r.metadata?.task_title || r.description,
                project_name: r.metadata?.project_name || "Unknown project",
                estimated_hours: r.metadata?.estimated_hours || 0,
            }));

        setExistingAssignments(mapped);
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
        try {
            setRemovingId(assignmentId);
            
            const { error: upErr } = await supabase
                .from("team_activity")
                .update({ metadata: { status: "removed" } })
                .eq("id", assignmentId);

            if (upErr) throw upErr;

            setExistingAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (err: any) {
            setError(err.message || "Failed to remove task.");
        } finally {
            setRemovingId(null);
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
                                        <div key={a.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 text-sm truncate">{a.task_title}</p>
                                                <p className="text-xs text-slate-500">{a.project_name} · {a.estimated_hours}h estimated</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(a.id)}
                                                disabled={removingId === a.id}
                                                className="ml-3 flex-shrink-0 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                                            >
                                                {removingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                Remove
                                            </button>
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
