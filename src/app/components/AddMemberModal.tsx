"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Loader2, CheckCircle2, Plus, ChevronDown } from "lucide-react";

interface WorkspaceUser {
    user_id: string;
    email: string;
    full_name: string;
}

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

function getInitials(name: string): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
}

export default function AddMemberModal({ workspaceId, onClose, onSuccess }: AddMemberModalProps) {
    const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [selectedUserId, setSelectedUserId] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [memberRole, setMemberRole] = useState<"member" | "pm">("member");
    const [capacityHours, setCapacityHours] = useState(40);
    const [hourlyRate, setHourlyRate] = useState<number | "">("");
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [customSkill, setCustomSkill] = useState("");

    useEffect(() => {
        const fetchAvailableUsers = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/add-team-member?workspace_id=${workspaceId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setWorkspaceUsers(data.available_users || []);
            } catch (err: any) {
                setError(err.message || "Failed to fetch workspace members");
            } finally {
                setLoading(false);
            }
        };
        fetchAvailableUsers();
    }, [workspaceId]);

    const handleSelectUser = (uid: string) => {
        setSelectedUserId(uid);
        const user = workspaceUsers.find(u => u.user_id === uid);
        if (user?.full_name) {
            const parts = user.full_name.trim().split(/\s+/);
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
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
        if (!selectedUserId) { setError("Please select a workspace member."); return; }
        if (!firstName.trim()) { setError("First name is required."); return; }
        if (!lastName.trim()) { setError("Last name is required."); return; }
        if (!jobTitle.trim()) { setError("Job title is required."); return; }

        const full_name = `${firstName.trim()} ${lastName.trim()}`;

        try {
            setSubmitting(true);
            setError("");
            const res = await fetch("/api/add-team-member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    user_id: selectedUserId,
                    full_name,
                    job_title: jobTitle.trim(),
                    skills: selectedSkills,
                    capacity_hours_per_week: capacityHours,
                    hourly_rate: hourlyRate || null,
                    role: memberRole,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess(true);
            setTimeout(() => { onSuccess(); onClose(); }, 1200);
        } catch (err: any) {
            setError(err.message || "Failed to add team member");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedUser = workspaceUsers.find(u => u.user_id === selectedUserId);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
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
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-green-500" />
                        </div>
                        <p className="text-lg font-bold text-slate-900">Member Added!</p>
                        <p className="text-slate-500 text-sm mt-1">
                            {firstName} {lastName} has been added as {memberRole === "pm" ? "a Project Manager" : "a Team Member"}.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* Step 1: Select workspace member */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Workspace Member <span className="text-red-500">*</span>
                            </label>
                            {loading ? (
                                <div className="flex items-center gap-2 text-slate-500 text-sm py-3">
                                    <Loader2 size={16} className="animate-spin" /> Loading members...
                                </div>
                            ) : workspaceUsers.length === 0 ? (
                                <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    All workspace members are already on the team. Invite new users first.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {workspaceUsers.map(u => {
                                        const displayName = u.full_name || u.email.split("@")[0];
                                        const isSelected = selectedUserId === u.user_id;
                                        return (
                                            <label
                                                key={u.user_id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? "border-indigo-500 bg-indigo-50"
                                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="user"
                                                    value={u.user_id}
                                                    checked={isSelected}
                                                    onChange={() => handleSelectUser(u.user_id)}
                                                    className="text-indigo-600 accent-indigo-600"
                                                />
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                    isSelected ? "bg-indigo-200 text-indigo-800" : "bg-slate-200 text-slate-700"
                                                }`}>
                                                    {getInitials(displayName)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-slate-900 text-sm truncate">{displayName}</div>
                                                    {u.email && (
                                                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Name fields (required) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    placeholder="e.g. Sarah"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    placeholder="e.g. Ahmed"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Job Title */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Job Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={jobTitle}
                                onChange={e => setJobTitle(e.target.value)}
                                placeholder="e.g. Frontend Developer, QA Engineer"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Project Role <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    memberRole === "member"
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}>
                                    <input
                                        type="radio"
                                        name="memberRole"
                                        value="member"
                                        checked={memberRole === "member"}
                                        onChange={() => setMemberRole("member")}
                                        className="accent-indigo-600"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Team Member</p>
                                        <p className="text-[11px] text-slate-500">Works on tasks</p>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    memberRole === "pm"
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}>
                                    <input
                                        type="radio"
                                        name="memberRole"
                                        value="pm"
                                        checked={memberRole === "pm"}
                                        onChange={() => setMemberRole("pm")}
                                        className="accent-indigo-600"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Project Manager</p>
                                        <p className="text-[11px] text-slate-500">Full access</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Capacity + Rate */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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

                        {/* Skills */}
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
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            selectedSkills.includes(skill)
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
                                            <button type="button" onClick={() => toggleSkill(skill)} className="hover:text-indigo-900">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Preview strip */}
                        {(firstName || lastName) && (
                            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-200 text-indigo-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                                    {getInitials(`${firstName} ${lastName}`)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {firstName} {lastName}
                                    </p>
                                    {jobTitle && <p className="text-xs text-slate-500 truncate">{jobTitle}</p>}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
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
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
