"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import {
  Users,
  Filter,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Link as LinkIcon,
  ShieldAlert,
  X,
  Loader2,
  Trash2,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  Crown,
  Copy,
  Check,
  AlertTriangle,
  Briefcase,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import TeamMemberCard from "../../../components/TeamMemberCard";
import CapacityGauge from "../../../components/CapacityGauge";
import ChangeRoleModal from "../../../components/ChangeRoleModal";
import EditMemberModal from "../../../components/EditMemberModal";
import AIAssignPanel from "../../../components/AIAssignPanel";
import AssignTaskModal from "../../../components/AssignTaskModal";
import AssignmentExplainer from "../../../components/AssignmentExplainer";
import { removeTeamMember, restoreTeamMember } from "./actions";

export interface MilestoneStatus {
  title: string;
  week: number;
  deadline: string;
  phase: "active" | "deferred" | "overdue" | "done";
  is_done: boolean;
  actual_status?: string;
  auto_completed: boolean;
  manually_completed: boolean;
  sprint_tasks_total: number;
  sprint_tasks_done: number;
  active_hours: number;
}

export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  milestones: MilestoneStatus[];
  sprint_tasks_active: number;
  sprint_tasks_done: number;
}

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  job_title?: string;
  avatar_url?: string;
  status: "online" | "away" | "offline" | "busy";
  skills: string[];
  capacity_hours_per_week: number;
  performance_score?: number;
  experience_level?: string | null;
  years_of_experience?: number | null;
  patterns?: {
    id: string;
    pattern_type: "task_incompatibility" | "group_conflict";
    reason: string;
    severity: "info" | "caution" | "blocker";
    task_type?: string;
    created_at: string;
  }[];
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

export default function TeamDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roleMap, setRoleMap] = useState<
    Map<string, "owner" | "pm" | "member">
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [assigningMember, setAssigningMember] = useState<TeamMember | null>(
    null,
  );
  const [changingRoleMember, setChangingRoleMember] =
    useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; sub: string } | null>(
    null,
  );

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictMemberA, setConflictMemberA] = useState("");
  const [conflictMemberB, setConflictMemberB] = useState("");
  const [conflictReason, setConflictReason] = useState("");
  const [conflictSeverity, setConflictSeverity] = useState<
    "info" | "caution" | "blocker"
  >("caution");
  const [recordingConflict, setRecordingConflict] = useState(false);
  const [conflictError, setConflictError] = useState("");

  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const [deletedMembers, setDeletedMembers] = useState<
    { id: string; full_name: string; deleted_at: string }[]
  >([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [restoringMemberId, setRestoringMemberId] = useState<string | null>(
    null,
  );
  const [trashError, setTrashError] = useState("");

  const showToast = (title: string, sub: string) => {
    setToast({ title, sub });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const resolveWorkspace = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .single();
      if (!data) return;

      setWorkspaceId(data.workspace_id);

      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", data.workspace_id)
        .single();

      const wsOwnerId = ws?.owner_id || null;
      setOwnerId(wsOwnerId);

      const isOwner = wsOwnerId === user.id;
      const callerRole = (data.role as string)?.toLowerCase();
      const adminFlag = isOwner || callerRole === "pm";

      // Block team members from accessing this page
      if (!adminFlag && callerRole !== "client") {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(adminFlag);
      setIsMember(!adminFlag && callerRole !== "client");

      // Build role map for all workspace members
      const { data: allMembers } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", data.workspace_id);

      const map = new Map<string, "owner" | "pm" | "member">();
      for (const m of allMembers || []) {
        const r = (m.role as string)?.toLowerCase();
        map.set(
          m.user_id,
          m.user_id === wsOwnerId ? "owner" : r === "pm" ? "pm" : "member",
        );
      }
      setRoleMap(map);

      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data: deletedRows } = await supabase
        .from("team_members")
        .select("id, full_name, deleted_at")
        .eq("workspace_id", data.workspace_id)
        .not("deleted_at", "is", null)
        .gt("deleted_at", thirtyDaysAgo)
        .order("deleted_at", { ascending: false });
      setDeletedMembers(
        (deletedRows || []) as {
          id: string;
          full_name: string;
          deleted_at: string;
        }[],
      );
    };
    resolveWorkspace();
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/team/workload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const members: TeamMember[] = data.members || [];
      setTeamMembers(members);
    } catch (err) {
      console.error("Failed to fetch team:", err);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) fetchTeamMembers();
  }, [workspaceId, fetchTeamMembers]);

  const metrics = (() => {
    const totalCap = teamMembers.reduce(
      (s, m) => s + m.load.capacity_monthly,
      0,
    );
    const totalUsed = teamMembers.reduce((s, m) => s + m.load.active_hours, 0);
    return {
      totalMembers: teamMembers.length,
      totalTasks: teamMembers.reduce(
        (s, m) => s + m.totals.sprint_tasks_total,
        0,
      ),
      availableHours: Math.max(0, totalCap - totalUsed),
      utilizationPercentage: totalCap > 0 ? (totalUsed / totalCap) * 100 : 0,
      overloadedCount: teamMembers.filter((m) => m.load.utilization_pct >= 90)
        .length,
      balancedCount: teamMembers.filter(
        (m) => m.load.utilization_pct >= 50 && m.load.utilization_pct < 90,
      ).length,
      underutilizedCount: teamMembers.filter((m) => m.load.utilization_pct < 50)
        .length,
    };
  })();

  const filtered = teamMembers.filter((m) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "overloaded") return m.load.utilization_pct >= 90;
    if (filterStatus === "available") return m.load.utilization_pct < 50;
    if (filterStatus === "with-projects") return m.projects.length > 0;
    return true;
  });

  const handleRecordConflict = async () => {
    if (!conflictMemberA || !conflictMemberB) {
      setConflictError("Please select both members.");
      return;
    }
    if (conflictMemberA === conflictMemberB) {
      setConflictError("Please select two different members.");
      return;
    }
    if (!conflictReason.trim()) {
      setConflictError("Please enter a reason.");
      return;
    }
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
      setConflictMemberA("");
      setConflictMemberB("");
      setConflictReason("");
      setConflictSeverity("caution");
      showToast(
        "Group conflict recorded",
        "AI will avoid co-assigning these members",
      );
      fetchTeamMembers();
    } catch (err: any) {
      setConflictError(err.message || "Failed to record conflict.");
    } finally {
      setRecordingConflict(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember || !workspaceId) return;
    if (removeConfirmText !== removingMember.full_name) return;
    setIsRemoving(true);
    setRemoveError("");
    const result = await removeTeamMember(removingMember.id, workspaceId);
    if (result?.error) {
      setRemoveError(result.error);
    } else {
      setDeletedMembers((prev) => [
        {
          id: removingMember.id,
          full_name: removingMember.full_name,
          deleted_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setRemovingMember(null);
      setRemoveConfirmText("");
      fetchTeamMembers();
      showToast(
        `${removingMember.full_name} moved to trash`,
        "Recoverable for 30 days",
      );
    }
    setIsRemoving(false);
  };

  const handleRestoreMember = async (memberId: string, memberName: string) => {
    if (!workspaceId) return;
    setRestoringMemberId(memberId);
    setTrashError("");
    const result = await restoreTeamMember(memberId, workspaceId);
    if (result?.error) {
      setTrashError(result.error);
    } else {
      setDeletedMembers((prev) => prev.filter((m) => m.id !== memberId));
      fetchTeamMembers();
      showToast(`${memberName} restored`, "Member is back on the team");
    }
    setRestoringMemberId(null);
  };

  function memberDaysRemaining(deletedAt: string) {
    return Math.max(
      0,
      30 -
        Math.floor(
          (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24),
        ),
    );
  }

  function copyInvite(role: "pm" | "member" | "client") {
    if (!workspaceId || typeof window === "undefined") return;
    const link = `${window.location.origin}/onboarding?invite=${workspaceId}&role=${role}`;
    navigator.clipboard.writeText(link);
    setCopiedKey(role);
    showToast("Invite link copied!", link.slice(0, 60) + "…");
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (loading && !workspaceId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
            <Cpu size={22} className="text-white" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading team…</p>
        </div>
      </div>
    );
  }

  // Access guard — plain members should not manage the team
  if (!loading && isMember) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={36} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          The Team Dashboard is for project managers and workspace owners only. As a team member, your tasks and project assignments are visible from the Projects section.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-green-200 shadow-xl rounded-2xl px-5 py-4 animate-in slide-in-from-bottom-4">
          <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              {toast.title}
            </p>
            <p className="text-xs text-slate-500">{toast.sub}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">People Management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchTeamMembers}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={15} /> Refresh
          </button>

          {teamMembers.length >= 2 && (
            <button
              onClick={() => setShowConflictModal(true)}
              className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ShieldAlert size={15} /> Record Conflict
            </button>
          )}

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowInvitePanel((v) => !v)}
                className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-violet-200"
              >
                <LinkIcon size={16} /> Invite People
              </button>

              {showInvitePanel && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowInvitePanel(false)}
                  />
                  <div className="absolute right-0 top-11 z-40 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Invite to Workspace
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Share a link — they join with the correct role
                        automatically
                      </p>
                    </div>

                    {/* Team Member link */}
                    <div className="px-4 py-3.5 border-b border-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Users size={13} className="text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Team Member
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Works on tasks, limited access
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyInvite("member")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            copiedKey === "member"
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {copiedKey === "member" ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                          {copiedKey === "member" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Client link — owner only */}
                    {ownerId === currentUserId && (
                      <div className="px-4 py-3.5 border-b border-slate-50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <Briefcase size={13} className="text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                Client
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Read-only project overview
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyInvite("client")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              copiedKey === "client"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {copiedKey === "client" ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                            {copiedKey === "client" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Project Manager link — owner only */}
                    {ownerId === currentUserId && (
                      <div className="px-4 py-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <ShieldCheck
                                size={13}
                                className="text-indigo-600"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                Project Manager
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Full access to all features
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyInvite("pm")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              copiedKey === "pm"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {copiedKey === "pm" ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                            {copiedKey === "pm" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                      <p className="text-[10px] text-amber-700 flex items-center gap-1.5">
                        <Crown size={10} className="flex-shrink-0" />
                        Client and PM links are owner-only
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <CapacityGauge {...metrics} />

      {teamMembers.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={40} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            No Team Members Yet
          </h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Add workspace members to your team. The AI will use their skills and
            availability to assign tasks automatically.
          </p>
          <button
            onClick={() => setShowInvitePanel(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-200"
          >
            <LinkIcon size={16} /> Invite First Member
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400 flex-shrink-0" />
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "All Members" },
                { value: "overloaded", label: "Overloaded" },
                { value: "available", label: "Available" },
                { value: "with-projects", label: "Has Projects" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                    filterStatus === f.value
                      ? "bg-violet-600 text-white shadow-violet-200"
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
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
                  <Cpu size={22} className="text-white" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Loading team…</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  workspaceId={workspaceId!}
                  workspaceRole={roleMap.get(member.user_id) ?? "member"}
                  callerIsOwner={ownerId === currentUserId}
                  onChangeRole={isAdmin ? (m) => setChangingRoleMember(m) : undefined}
                  onEditProfile={isAdmin ? (m) => setEditingMember(m) : undefined}
                  onPatternRecorded={fetchTeamMembers}
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

      {changingRoleMember && workspaceId && (
        <ChangeRoleModal
          member={changingRoleMember}
          currentRole={roleMap.get(changingRoleMember.user_id) ?? "member"}
          workspaceId={workspaceId}
          callerIsOwner={ownerId === currentUserId}
          onClose={() => setChangingRoleMember(null)}
          onSuccess={(newRole) => {
            setRoleMap((prev) => {
              const next = new Map(prev);
              next.set(changingRoleMember.user_id, newRole);
              return next;
            });
            setChangingRoleMember(null);
            showToast(
              `Role updated`,
              `${changingRoleMember.full_name} is now a ${newRole === "pm" ? "Project Manager" : "Team Member"}`,
            );
          }}
        />
      )}

      {editingMember && workspaceId && (
        <EditMemberModal
          member={editingMember}
          workspaceId={workspaceId}
          onClose={() => setEditingMember(null)}
          onSaved={(updated) => {
            setTeamMembers((prev) =>
              prev.map((m) =>
                m.id === editingMember.id ? { ...m, ...updated } : m,
              ),
            );
            setEditingMember(null);
            showToast(
              "Profile updated",
              `${editingMember.full_name}'s work profile has been saved`,
            );
          }}
        />
      )}

      {assigningMember && workspaceId && (
        <AssignTaskModal
          member={assigningMember}
          workspaceId={workspaceId}
          onClose={() => {
            setAssigningMember(null);
            fetchTeamMembers();
          }}
          onSuccess={(taskTitle, projectName) => {
            setAssigningMember(null);
            showToast(`"${taskTitle}" assigned`, projectName);
            fetchTeamMembers();
          }}
        />
      )}

      {/* Group Conflict Modal */}
      {showConflictModal && workspaceId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <ShieldAlert className="text-amber-500" /> Record Group Conflict
              </h2>
              <button
                onClick={() => setShowConflictModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              The AI will avoid assigning these two members to the same tasks in
              the future.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Member A
                  </label>
                  <select
                    value={conflictMemberA}
                    onChange={(e) => setConflictMemberA(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="">Select...</option>
                    {teamMembers.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={m.id === conflictMemberB}
                      >
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Member B
                  </label>
                  <select
                    value={conflictMemberB}
                    onChange={(e) => setConflictMemberB(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="">Select...</option>
                    {teamMembers.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={m.id === conflictMemberA}
                      >
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={conflictReason}
                  onChange={(e) => setConflictReason(e.target.value)}
                  placeholder="e.g., Communication breakdown on previous project"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Severity
                </label>
                <select
                  value={conflictSeverity}
                  onChange={(e) => setConflictSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="info">Info (Prefer not to mix)</option>
                  <option value="caution">Caution (Avoid if possible)</option>
                  <option value="blocker">Blocker (Never co-assign)</option>
                </select>
              </div>
              {conflictError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                  {conflictError}
                </div>
              )}
              <button
                onClick={handleRecordConflict}
                disabled={recordingConflict}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium flex justify-center items-center gap-2"
              >
                {recordingConflict && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Confirm Conflict
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recently Removed Members */}
      {isAdmin && deletedMembers.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setTrashOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
              <Trash2 size={15} className="text-red-400" />
              Recently Removed Members
              <span className="bg-red-50 text-red-500 border border-red-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {deletedMembers.length}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform duration-200 ${trashOpen ? "rotate-180" : ""}`}
            />
          </button>

          {trashOpen && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {trashError && (
                <div className="px-5 py-2.5 bg-red-50 text-red-600 text-xs font-medium flex items-center justify-between">
                  {trashError}
                  <button onClick={() => setTrashError("")}>
                    <X size={13} />
                  </button>
                </div>
              )}
              {deletedMembers.map((m) => {
                const days = memberDaysRemaining(m.deleted_at);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Users size={14} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {m.full_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {days > 0
                          ? `Permanently removed in ${days} day${days !== 1 ? "s" : ""}`
                          : "Expires today"}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        days <= 3
                          ? "bg-red-50 text-red-600 border-red-200"
                          : days <= 7
                            ? "bg-amber-50 text-amber-600 border-amber-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {days}d left
                    </span>
                    <button
                      onClick={() => handleRestoreMember(m.id, m.full_name)}
                      disabled={restoringMemberId === m.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {restoringMemberId === m.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Remove Member Modal */}
      {removingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Remove Team Member
                  </h2>
                  <p className="text-xs text-slate-500">
                    Recoverable for 30 days
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRemovingMember(null)}
                className="p-2 hover:bg-red-100 rounded-xl"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to remove{" "}
                <span className="font-bold text-slate-900">
                  {removingMember.full_name}
                </span>{" "}
                from this workspace. They will be moved to trash and can be
                restored within 30 days.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Type{" "}
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-red-600">
                    {removingMember.full_name}
                  </span>{" "}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={removeConfirmText}
                  onChange={(e) => setRemoveConfirmText(e.target.value)}
                  placeholder={removingMember.full_name}
                  autoFocus
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 font-mono"
                />
              </div>
              {removeError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                  {removeError}
                </p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setRemovingMember(null)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={
                  removeConfirmText !== removingMember.full_name || isRemoving
                }
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-200 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Removing…
                  </>
                ) : (
                  "Remove Member"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
