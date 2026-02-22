
"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import {
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    User,
    Clock,
    ExternalLink,
} from "lucide-react";

interface Project {
    id: string;
    name: string;
    milestone_count: number;
}

interface AssignResult {
    task_title?: string;
    task_name?: string;
    assigned_to_name: string;
    reasoning: string;
}

interface AIAssignPanelProps {
    workspaceId: string;
    teamMemberCount: number;
}

export default function AIAssignPanel({ workspaceId, teamMemberCount }: AIAssignPanelProps) {
    const supabase = createClient();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetchingProjects, setFetchingProjects] = useState(true);
    const [results, setResults] = useState<AssignResult[]>([]);
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        if (workspaceId) fetchProjects();
    }, [workspaceId]);

    const fetchProjects = async () => {
        try {
            setFetchingProjects(true);
            
            const { data: projectsData, error: pErr } = await supabase
                .from("projects")
                .select("id, name, ai_data")
                .eq("workspace_id", workspaceId)
                .eq("ai_status", "completed");

            if (pErr) throw pErr;

            const mapped: Project[] = (projectsData || []).map(p => ({
                id: p.id,
                name: p.name,
                milestone_count: p.ai_data?.milestones?.length || 0,
            }));

            setProjects(mapped);
        } catch (err) {
            console.error("Error fetching projects:", err);
            setProjects([]);
        } finally {
            setFetchingProjects(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedProject) { setError("Please select a project"); return; }
        if (teamMemberCount === 0) { setError("No team members available. Add members first."); return; }

        try {
            setLoading(true);
            setError("");
            setResults([]);

            const response = await fetch("/api/assign-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: selectedProject, workspaceId }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setResults(data.assignments || []);
        } catch (err: any) {
            setError(err.message || "AI assignment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const selectedProjectObj = projects.find(p => p.id === selectedProject);

    return (
        <div className="bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl overflow-hidden">
            
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-900">AI Task Assignment</h3>
                        <p className="text-sm text-slate-500">Auto-assign project milestones to team members</p>
                    </div>
                </div>
                {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {expanded && (
                <div className="px-5 pb-5 space-y-4">
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Select Project to Staff
                        </label>
                        {fetchingProjects ? (
                            <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                                <Loader2 size={14} className="animate-spin" /> Loading projects...
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="text-sm text-slate-500 bg-white/60 rounded-xl p-3 border border-amber-200 bg-amber-50">
                                ⚠️ No completed projects found. Go to Projects, upload a document, and wait for AI analysis to complete.
                            </div>
                        ) : (
                            <select
                                value={selectedProject}
                                onChange={e => { setSelectedProject(e.target.value); setResults([]); setError(""); }}
                                className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Choose a project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — {p.milestone_count} milestone{p.milestone_count !== 1 ? "s" : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                        {selectedProject && (
                            <a
                                href={`/dashboard/projects/${selectedProject}/allocation`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                            >
                                <ExternalLink size={11} />
                                View full allocation page for this project
                            </a>
                        )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 rounded-lg text-xs text-slate-600 border border-indigo-100">
                            <User size={12} className="text-indigo-500" />
                            {teamMemberCount} team member{teamMemberCount !== 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 rounded-lg text-xs text-slate-600 border border-indigo-100">
                            <Sparkles size={12} className="text-indigo-500" />
                            Powered by Llama 3.3-70B
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/70 rounded-lg text-xs text-slate-600 border border-indigo-100">
                            <Clock size={12} className="text-indigo-500" />
                            Matches skills &amp; capacity
                        </span>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleAssign}
                        disabled={loading || !selectedProject || teamMemberCount === 0 || projects.length === 0}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                AI is analyzing team &amp; milestones...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Auto-Staff {selectedProjectObj ? `"${selectedProjectObj.name}"` : "Project"}
                            </>
                        )}
                    </button>

                    {results.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                                <CheckCircle2 size={16} />
                                {results.length} milestone{results.length !== 1 ? "s" : ""} assigned!
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {results.map((r, i) => (
                                    <div key={i} className="bg-white rounded-xl p-3 border border-green-100 shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span className="font-semibold text-slate-900 text-sm">{r.task_title || r.task_name}</span>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                                → {r.assigned_to_name}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 italic">{r.reasoning}</p>
                                    </div>
                                ))}
                            </div>
                            {selectedProject && (
                                <a
                                    href={`/dashboard/projects/${selectedProject}/allocation`}
                                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline"
                                >
                                    <ExternalLink size={14} />
                                    View full allocation details →
                                </a>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
