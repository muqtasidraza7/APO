
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import { Users, UserPlus, Filter, RefreshCw, CheckCircle2 } from "lucide-react";
import TeamMemberCard from "../../../components/TeamMemberCard";
import CapacityGauge from "../../../components/CapacityGauge";
import AddMemberModal from "../../../components/AddMemberModal";
import AIAssignPanel from "../../../components/AIAssignPanel";
import AssignTaskModal from "../../../components/AssignTaskModal";

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
        .select("id, team_member_id, metadata, description")
        .eq("workspace_id", workspaceId)
        .eq("activity_type", "task_assigned");

      const assignmentsByMember: Record<string, { title: string; hours: number }[]> = {};
      for (const act of activities || []) {
        if (act.metadata?.status === "removed") continue;
        const memberId = act.team_member_id;
        if (!memberId) continue;
        if (!assignmentsByMember[memberId]) assignmentsByMember[memberId] = [];
        assignmentsByMember[memberId].push({
          title: act.metadata?.task_title || act.description || "Task",
          hours: act.metadata?.estimated_hours || 0,
        });
      }

      const mapped: TeamMember[] = (members || []).map((m) => {
        const tasks = assignmentsByMember[m.id] || [];
        const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
        const capacity = m.capacity_hours_per_week || 40;
        const utilization = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0;

        return {
          ...m,
          full_name: m.job_title || "Team Member",
          email: "",
          workload: {
            total_tasks: tasks.length,
            active_tasks: tasks.length,
            completed_tasks: 0,
            estimated_hours_remaining: totalHours,
            total_hours_logged: 0,
            utilization_percentage: utilization,
          },
          active_tasks: tasks.map((t, i) => ({
            id: String(i),
            title: t.title,
            status: "in_progress",
          })),
          completed_this_month: 0,
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
            <p className="text-xs text-slate-500">"{toast.title}" → {toast.project}</p>
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
    </div>
  );
}
