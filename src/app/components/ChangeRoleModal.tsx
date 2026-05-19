"use client";

import { useState } from "react";
import { X, ShieldCheck, Users, Loader2, CheckCircle2, Crown } from "lucide-react";

interface ChangeRoleModalProps {
  member: { id: string; user_id: string; full_name: string };
  currentRole: "owner" | "pm" | "member";
  workspaceId: string;
  callerIsOwner: boolean;
  onClose: () => void;
  onSuccess: (newRole: "pm" | "member") => void;
}

export default function ChangeRoleModal({
  member,
  currentRole,
  workspaceId,
  callerIsOwner,
  onClose,
  onSuccess,
}: ChangeRoleModalProps) {
  const [selected, setSelected] = useState<"pm" | "member">(
    currentRole === "pm" ? "pm" : "member"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const unchanged = selected === currentRole || (currentRole === "owner");

  const handleSave = async () => {
    if (unchanged) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/workspace-members/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: member.user_id,
          workspaceId,
          newRole: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change role");
      setDone(true);
      setTimeout(() => { onSuccess(selected); onClose(); }, 1000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
              <ShieldCheck size={17} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Change Role</h2>
              <p className="text-[11px] text-slate-400">Update workspace permissions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-green-500" />
            </div>
            <p className="font-bold text-slate-900 text-sm">Role updated</p>
            <p className="text-xs text-slate-500 mt-1">
              {member.full_name} is now a {selected === "pm" ? "Project Manager" : "Team Member"}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Member preview */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(member.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</p>
                <p className="text-[11px] text-slate-400">
                  Current:{" "}
                  <span className={`font-semibold ${
                    currentRole === "owner" ? "text-violet-600" :
                    currentRole === "pm"    ? "text-indigo-600" : "text-slate-600"
                  }`}>
                    {currentRole === "owner" ? "Owner" : currentRole === "pm" ? "Project Manager" : "Team Member"}
                  </span>
                </p>
              </div>
              {currentRole === "owner" && <Crown size={16} className="text-violet-500 flex-shrink-0 ml-auto" />}
            </div>

            {/* Owner lock */}
            {currentRole === "owner" ? (
              <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-700 text-center">
                The workspace owner's role cannot be changed.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {/* Team Member option */}
                  <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selected === "member"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={selected === "member"}
                      onChange={() => setSelected("member")}
                      className="accent-indigo-600"
                    />
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users size={15} className="text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Team Member</p>
                      <p className="text-[11px] text-slate-400">Works on assigned tasks, limited dashboard access</p>
                    </div>
                  </label>

                  {/* Project Manager option — only owner can grant this */}
                  <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    !callerIsOwner
                      ? "opacity-50 cursor-not-allowed border-slate-200"
                      : selected === "pm"
                        ? "border-indigo-500 bg-indigo-50 cursor-pointer"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="pm"
                      checked={selected === "pm"}
                      onChange={() => callerIsOwner && setSelected("pm")}
                      disabled={!callerIsOwner}
                      className="accent-indigo-600"
                    />
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={15} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">Project Manager</p>
                      <p className="text-[11px] text-slate-400">Full access — create projects, manage team</p>
                    </div>
                    {!callerIsOwner && (
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full flex-shrink-0">
                        Owner only
                      </span>
                    )}
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || unchanged}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    {saving ? "Saving…" : "Save Role"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
