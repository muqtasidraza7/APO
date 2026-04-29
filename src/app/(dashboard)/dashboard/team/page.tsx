
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Users, UserPlus, Filter, RefreshCw, CheckCircle2, Link as LinkIcon, ShieldAlert, X, Loader2 } from "lucide-react";
import TeamMemberCard from "../../../components/TeamMemberCard";
import CapacityGauge from "../../../components/CapacityGauge";
import AddMemberModal from "../../../components/AddMemberModal";
import AIAssignPanel from "../../../components/AIAssignPanel";
import AssignTaskModal from "../../../components/AssignTaskModal";
import AssignmentExplainer from "../../../components/AssignmentExplainer";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  job_title?: string;
  avatar_url?: string;
  status: "online" | "away" | "offline" | "busy";
  skills: string[];
  capacity_hours_per_week: number;
  performance_score?: number;
  patterns?: {
    id: string;
    pattern_type: "task_incompatibility" | "group_conflict";
    reason: string;
    severity: "info" | "caution" | "blocker";
    task_type?: string;
    created_at: string;
  }[];
  workload?: {
    total_tasks: number;
    active_tasks: number;
    completed_tasks: number;
    estimated_hours_remaining: number;
    total_hours_logged: number;
    utilization_percentage: number;
  };
  active_tasks?: any[];
  completed_this_month?: number;
}

export default function TeamDashboardPage() {
  const supabase = createClient();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningMember, setAssigningMember] = useState<TeamMember | null>(null);
  const [toast, setToast] = useState<{ title: string; project: string } | null>(null);
  // 6.3: Group conflict recording modal
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictMemberA, setConflictMemberA] = useState("");
  const [conflictMemberB, setConflictMemberB] = useState("");
  const [conflictReason, setConflictReason] = useState("");
  const [conflictSeverity, setConflictSeverity] = useState<"info" | "caution" | "blocker">("caution");
  const [recordingConflict, setRecordingConflict] = useState(false);
  const [conflictError, setConflictError] = useState("");

  useEffect(() => {
    const resolveWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();
      if (data) setWorkspaceId(data.workspace_id);
    };
    resolveWorkspace();
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);

      const { data: members, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
        return;
      }

      const { data: activities } = await supabase
        .from("team_activity")
        .select("id, team_member_id, metadata, description, activity_type, created_at")
        .eq("workspace_id", workspaceId)
        .in("activity_type", ["task_assigned", "task_completed"]);

      // Build a net workload per member: add assigned hours, subtract completed hours
      const assignmentsByMember: Record<string, { title: string; hours: number }[]> = {};
      const completedByMember: Record<string, { title: string; completedAt: string }[]> = {};

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      for (const act of activities || []) {
        const memberId = act.team_member_id;
        if (!memberId) continue;

        if (act.activity_type === "task_assigned" && act.metadata?.status !== "removed") {
          if (!assignmentsByMember[memberId]) assignmentsByMember[memberId] = [];
          assignmentsByMember[memberId].push({
            title: act.metadata?.task_title || act.description || "Task",
            hours: act.metadata?.estimated_hours || 0,
          });
        }

        if (act.activity_type === "task_completed") {
          if (!completedByMember[memberId]) completedByMember[memberId] = [];
          completedByMember[memberId].push({
            title: act.metadata?.task_title || act.description || "Task",
            completedAt: act.created_at,
          });
        }
      }

      // Fetch all unresolved patterns for this workspace
      const { data: patterns } = await supabase
        .from("worker_patterns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("resolved", false);

      // Group patterns by the member they apply to
      const patternsByMember: Record<string, any[]> = {};
      for (const p of patterns || []) {
        const typed = {
          ...p,
          pattern_type: p.pattern_type as "task_incompatibility" | "group_conflict",
        };
        if (p.pattern_type === "task_incompatibility" && p.member_id) {
          if (!patternsByMember[p.member_id]) patternsByMember[p.member_id] = [];
          patternsByMember[p.member_id].push(typed);
        }
        if (p.pattern_type === "group_conflict") {
          if (p.member_id_a) {
            if (!patternsByMember[p.member_id_a]) patternsByMember[p.member_id_a] = [];
            patternsByMember[p.member_id_a].push(typed);
          }
          if (p.member_id_b) {
            if (!patternsByMember[p.member_id_b]) patternsByMember[p.member_id_b] = [];
            patternsByMember[p.member_id_b].push(typed);
          }
        }
      }

      const mapped: TeamMember[] = (members || []).map((m) => {
        const allTasks = assignmentsByMember[m.id] || [];
        const completedTasks = completedByMember[m.id] || [];
        
        // Build set of completed task titles so we can exclude them from active
        const completedTitles = new Set(completedTasks.map((t) => t.title));
        
        // Active tasks = assigned tasks that haven't been completed yet
        const activeTasks = allTasks.filter((t) => !completedTitles.has(t.title));
        const activeHours = activeTasks.reduce((sum, t) => sum + t.hours, 0);
        
        const capacity = m.capacity_hours_per_week || 40;
        const utilization = capacity > 0 ? Math.round((activeHours / capacity) * 100) : 0;

        // completed_this_month = tasks completed in the current calendar month
        const completedThisMonth = completedTasks.filter(
          (t) => new Date(t.completedAt) >= startOfMonth
        ).length;

        return {
          ...m,
          full_name: m.full_name || m.job_title || "Team Member",
          email: m.email || "",
          performance_score: m.performance_score ?? 100,
          patterns: patternsByMember[m.id] || [],
          workload: {
            total_tasks: allTasks.length,
            active_tasks: activeTasks.length,
            completed_tasks: completedTasks.length,
            estimated_hours_remaining: activeHours,
            total_hours_logged: completedTasks.length * 8,
            utilization_percentage: utilization,
          },
          active_tasks: activeTasks.map((t, i) => ({
            id: String(i),
            title: t.title,
            status: "in_progress",
          })),
          completed_this_month: completedThisMonth,
        };
      });

      setTeamMembers(mapped);
    } catch (err) {
      console.error("Unexpected error:", err);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) fetchTeamMembers();
  }, [workspaceId, fetchTeamMembers]);

  const metrics = (() => {
    const totalMembers = teamMembers.length;
    const totalTasks = teamMembers.reduce((s, m) => s + (m.workload?.active_tasks || 0), 0);
    const totalCap = teamMembers.reduce((s, m) => s + m.capacity_hours_per_week, 0);
    const totalUsed = teamMembers.reduce((s, m) => s + (m.workload?.estimated_hours_remaining || 0), 0);
    const utilizationPercentage = totalCap > 0 ? (totalUsed / totalCap) * 100 : 0;
    return {
      totalMembers,
      totalTasks,
      availableHours: Math.max(0, totalCap - totalUsed),
      utilizationPercentage,
      overloadedCount: teamMembers.filter(m => (m.workload?.utilization_percentage || 0) >= 90).length,
      balancedCount: teamMembers.filter(m => { const u = m.workload?.utilization_percentage || 0; return u >= 50 && u < 90; }).length,
      underutilizedCount: teamMembers.filter(m => (m.workload?.utilization_percentage || 0) < 50).length,
    };
  })();

  const filtered = teamMembers.filter(m => {
    if (filterStatus === "all") return true;
    if (filterStatus === "online") return m.status === "online" || m.status === "busy";
    if (filterStatus === "overloaded") return (m.workload?.utilization_percentage || 0) >= 90;
    if (filterStatus === "available") return (m.workload?.utilization_percentage || 0) < 50;
    return true;
  });

  const showToast = (title: string, project: string) => {
    setToast({ title, project });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRecordConflict = async () => {
    if (!conflictMemberA || !conflictMemberB) { setConflictError("Please select both members."); return; }
    if (conflictMemberA === conflictMemberB) { setConflictError("Please select two different members."); return; }
    if (!conflictReason.trim()) { setConflictError("Please enter a reason."); return; }
    setRecordingConflict(true);
    setConflictError("");
    try {
      const res = await fetch("/api/worker-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          pattern_type: "group_conflict",
          member_id_a: conflictMemberA,
          member_id_b: conflictMemberB,
          reason: conflictReason,
          severity: conflictSeverity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowConflictModal(false);
      setConflictMemberA(""); setConflictMemberB("");
      setConflictReason(""); setConflictSeverity("caution");
      showToast("Group conflict recorded", "AI will avoid co-assigning these members");
      fetchTeamMembers(); // refresh scores
    } catch (err: any) {
      setConflictError(err.message || "Failed to record conflict.");
    } finally {
      setRecordingConflict(false);
    }
  };

  if (loading && !workspaceId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-green-200 shadow-xl rounded-2xl px-5 py-4 animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">Task Assigned!</p>
            <p className="text-xs text-slate-500">&quot;{toast.title}&quot; → {toast.project}</p>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">People Management</p>
          <h1 className="text-3xl font-bold text-slate-900">Team Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTeamMembers}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {/* 6.3: Record Group Conflict button */}
          {teamMembers.length >= 2 && (
            <button
              onClick={() => setShowConflictModal(true)}
              className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-2"
            >
              <ShieldAlert size={16} />
              Record Conflict
            </button>
          )}
          <button
            onClick={() => {
              if (workspaceId && typeof window !== "undefined") {
                const inviteLink = `${window.location.origin}/onboarding?invite=${workspaceId}`;
                navigator.clipboard.writeText(inviteLink);
                showToast("Invite link copied to clipboard", "Share with your team");
              }
            }}
            className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-2"
          >
            <LinkIcon size={16} />
            Copy Invite Link
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus size={18} />
            Add Member
          </button>
        </div>
      </div>

      <CapacityGauge {...metrics} />

      {workspaceId && teamMembers.length > 0 && (
        <AIAssignPanel
          workspaceId={workspaceId}
          teamMemberCount={teamMembers.length}
        />
      )}

      {workspaceId && teamMembers.length > 0 && (
        <AssignmentExplainer workspaceId={workspaceId} />
      )}

      {teamMembers.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={40} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No Team Members Yet</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Add workspace members to your team. The AI will use their skills and availability to assign tasks automatically.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <UserPlus size={18} className="mr-2" />
            Add First Member
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={16} className="text-slate-400" />
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "All Members" },
                { value: "online", label: "Online" },
                { value: "overloaded", label: "Overloaded" },
                { value: "available", label: "Available" },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === f.value
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-slate-400 ml-auto">
              {filtered.length} / {teamMembers.length} members
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={32} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onAssignTask={() => setAssigningMember(member)}
                  onMessage={() => { }}
                  onViewDetails={() => { }}
                />
              ))}
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <p className="text-center text-slate-400 py-8">
              No members match this filter.
            </p>
          )}
        </>
      )}

      {showAddModal && workspaceId && (
        <AddMemberModal
          workspaceId={workspaceId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchTeamMembers();
          }}
        />
      )}

      {assigningMember && workspaceId && (
        <AssignTaskModal
          member={assigningMember}
          workspaceId={workspaceId}
          onClose={() => { setAssigningMember(null); fetchTeamMembers(); }}
          onSuccess={(taskTitle, projectName) => {
            setAssigningMember(null);
            showToast(taskTitle, projectName);
            fetchTeamMembers();
          }}
        />
      )}

      {/* 6.3: Group Conflict Recording Modal */}
      {showConflictModal && workspaceId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <ShieldAlert className="text-amber-500" /> Record Group Conflict
              </h2>
              <button onClick={() => setShowConflictModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Record a conflict between two members. The AI will avoid assigning them to the same project or dependent tasks in the future.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Member A</label>
                  <select
                    value={conflictMemberA}
                    onChange={e => setConflictMemberA(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">Select...</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id} disabled={m.id === conflictMemberB}>{m.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Member B</label>
                  <select
                    value={conflictMemberB}
                    onChange={e => setConflictMemberB(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">Select...</option>
                    {teamMembers.map(m => <option key={m.id} value={m.id} disabled={m.id === conflictMemberA}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={conflictReason}
                  onChange={e => setConflictReason(e.target.value)}
                  placeholder="e.g., Communication breakdown on previous project"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Severity</label>
                <select
                  value={conflictSeverity}
                  onChange={e => setConflictSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="info">Info (Prefer not to mix)</option>
                  <option value="caution">Caution (Avoid if possible)</option>
                  <option value="blocker">Blocker (Never co-assign)</option>
                </select>
              </div>

              {conflictError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">{conflictError}</div>
              )}

              <button
                onClick={handleRecordConflict}
                disabled={recordingConflict}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium mt-2 flex justify-center items-center gap-2"
              >
                {recordingConflict && <Loader2 size={16} className="animate-spin" />}
                Confirm Conflict
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
