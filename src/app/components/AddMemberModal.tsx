
"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import {
    X,
    UserPlus,
    Loader2,
    CheckCircle2,
    Plus,
    Trash2,
} from "lucide-react";

interface AddMemberModalProps {
    workspaceId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const COMMON_SKILLS = [
    "React", "TypeScript", "JavaScript", "Node.js", "Python", "PostgreSQL",
    "MongoDB", "AWS", "Docker", "Figma", "UI/UX", "Project Management",
    "Data Analysis", "Machine Learning", "DevOps", "Java", "C#", "PHP",
    "Marketing", "Content Writing", "SEO", "Finance", "Business Analysis",
];

export default function AddMemberModal({ workspaceId, onClose, onSuccess }: AddMemberModalProps) {
    const supabase = createClient();
    const [workspaceUsers, setWorkspaceUsers] = useState<{ user_id: string; email?: string; name?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [selectedUserId, setSelectedUserId] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [capacityHours, setCapacityHours] = useState(40);
    const [hourlyRate, setHourlyRate] = useState<number | "">("");
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [customSkill, setCustomSkill] = useState("");

    useEffect(() => {
        fetchAvailableUsers();
    }, []);

    const fetchAvailableUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/add-team-member?workspace_id=${workspaceId}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            const { data: { user: currentUser } } = await supabase.auth.getUser();

            const availableUsers = (data.available_user_ids || []).map((uid: string) => ({
                user_id: uid,
                name: uid === currentUser?.id ? `You (${currentUser?.email?.split("@")[0]})` : `User ${uid.substring(0, 8)}`,
                email: uid === currentUser?.id ? currentUser?.email : "",
            }));

            setWorkspaceUsers(availableUsers);
        } catch (err: any) {
            setError(err.message || "Failed to fetch workspace members");
        } finally {
            setLoading(false);
        }
    };

    const toggleSkill = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const addCustomSkill = () => {
        const trimmed = customSkill.trim();
        if (trimmed && !selectedSkills.includes(trimmed)) {
            setSelectedSkills(prev => [...prev, trimmed]);
            setCustomSkill("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) { setError("Please select a user"); return; }
        if (!jobTitle.trim()) { setError("Please enter a job title"); return; }

        try {
            setSubmitting(true);
            setError("");

            const response = await fetch("/api/add-team-member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    user_id: selectedUserId,
                    job_title: jobTitle.trim(),
                    skills: selectedSkills,
                    capacity_hours_per_week: capacityHours,
                    hourly_rate: hourlyRate || null,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);
        } catch (err: any) {
            setError(err.message || "Failed to add team member");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <UserPlus size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Add Team Member</h2>
                            <p className="text-sm text-slate-500">Add a workspace member to your team</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {success ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-bold text-slate-900">Member Added!</p>
                        <p className="text-slate-500 text-sm mt-1">Team member has been added successfully.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Workspace Member <span className="text-red-500">*</span>
                            </label>
                            {loading ? (
                                <div className="flex items-center gap-2 text-slate-500 text-sm py-3">
                                    <Loader2 size={16} className="animate-spin" />
                                    Loading workspace members...
                                </div>
                            ) : workspaceUsers.length === 0 ? (
                                <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    All workspace members are already on the team! Invite new users to your workspace first.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {workspaceUsers.map(u => (
                                        <label
                                            key={u.user_id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedUserId === u.user_id
                                                    ? "border-indigo-500 bg-indigo-50"
                                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="user"
                                                value={u.user_id}
                                                checked={selectedUserId === u.user_id}
                                                onChange={() => setSelectedUserId(u.user_id)}
                                                className="text-indigo-600"
                                            />
                                            <div>
                                                <div className="font-medium text-slate-900 text-sm">{u.name}</div>
                                                {u.email && <div className="text-xs text-slate-500">{u.email}</div>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Job Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={jobTitle}
                                onChange={e => setJobTitle(e.target.value)}
                                placeholder="e.g. Frontend Developer, Project Manager"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Capacity (hrs/week)
                                </label>
                                <input
                                    type="number"
                                    value={capacityHours}
                                    onChange={e => setCapacityHours(Number(e.target.value))}
                                    min={1} max={168}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Hourly Rate ($)
                                </label>
                                <input
                                    type="number"
                                    value={hourlyRate}
                                    onChange={e => setHourlyRate(e.target.value ? Number(e.target.value) : "")}
                                    placeholder="Optional"
                                    min={0}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Skills <span className="text-slate-400 font-normal">(select all that apply)</span>
                            </label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {COMMON_SKILLS.map(skill => (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedSkills.includes(skill)
                                                ? "bg-indigo-600 text-white"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                    >
                                        {skill}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customSkill}
                                    onChange={e => setCustomSkill(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                                    placeholder="Add custom skill..."
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={addCustomSkill}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    <Plus size={16} className="text-slate-600" />
                                </button>
                            </div>
                            
                            {selectedSkills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedSkills.map(skill => (
                                        <span
                                            key={skill}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100"
                                        >
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => toggleSkill(skill)}
                                                className="hover:text-indigo-900"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || loading || workspaceUsers.length === 0}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                {submitting ? "Adding..." : "Add to Team"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
