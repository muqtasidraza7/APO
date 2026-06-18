"use client";

import { useState, useEffect } from "react";
import {
  X, Save, Loader2, CheckCircle2, Clock, History,
  ChevronDown, User, Briefcase, Star, Plus, AlertTriangle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface EditableMember {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  job_title?: string;
  experience_level?: string | null;
  years_of_experience?: number | null;
  capacity_hours_per_week: number;
  hourly_rate?: number | null;
  skills: string[];
  performance_score?: number;
}

interface EditHistory {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

interface EditMemberModalProps {
  member: EditableMember;
  workspaceId: string;
  onClose: () => void;
  onSaved: (updated: Partial<EditableMember>) => void;
}

const EXP_LEVELS = ["Junior", "Mid-Level", "Senior", "Lead", "Executive"];

const COMMON_SKILLS = [
  "React", "TypeScript", "JavaScript", "Node.js", "Python", "PostgreSQL",
  "MongoDB", "AWS", "Docker", "Figma", "UI/UX", "Project Management",
  "Data Analysis", "Machine Learning", "DevOps", "Java", "C#", "PHP",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditMemberModal({
  member,
  workspaceId,
  onClose,
  onSaved,
}: EditMemberModalProps) {
  // Editable state
  const [jobTitle, setJobTitle]     = useState(member.job_title || "");
  const [expLevel, setExpLevel]     = useState(member.experience_level || "");
  const [yearsExp, setYearsExp]     = useState<number | "">(member.years_of_experience ?? "");
  const [capacity, setCapacity]     = useState<number>(member.capacity_hours_per_week ?? 40);
  const [hourlyRate, setHourlyRate] = useState<number | "">(member.hourly_rate ?? "");
  const [skills, setSkills]         = useState<string[]>(member.skills || []);
  const [customSkill, setCustomSkill] = useState("");

  // UI state
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState("");
  const [tab, setTab]                 = useState<"edit" | "history">("edit");
  const [history, setHistory]         = useState<EditHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);

  // Load history when switching to history tab
  useEffect(() => {
    if (tab !== "history") return;
    setHistoryLoading(true);
    fetch(`/api/team-members/profile?memberId=${member.id}`)
      .then(r => r.ok ? r.json() : { history: [] })
      .then(d => setHistory(d.history || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [tab, member.id]);

  const toggleSkill = (skill: string) =>
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  const addCustomSkill = () => {
    const t = customSkill.trim();
    if (t && !skills.includes(t)) { setSkills(prev => [...prev, t]); setCustomSkill(""); }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/team-members/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId:    member.id,
          workspaceId,
          changes: {
            job_title:               jobTitle.trim() || null,
            experience_level:        expLevel || null,
            years_of_experience:     yearsExp === "" ? null : Number(yearsExp),
            capacity_hours_per_week: capacity,
            hourly_rate:             hourlyRate === "" ? null : Number(hourlyRate),
            skills,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaved(true);
      onSaved({
        job_title:               jobTitle.trim() || undefined,
        experience_level:        expLevel || null,
        years_of_experience:     yearsExp === "" ? null : Number(yearsExp),
        capacity_hours_per_week: capacity,
        hourly_rate:             hourlyRate === "" ? null : Number(hourlyRate),
        skills,
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {getInitials(member.full_name)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{member.full_name}</h2>
              <p className="text-xs text-slate-400">{member.email || "No email"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setTab("edit")}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              tab === "edit"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <User size={14} /> Edit Profile
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              tab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <History size={14} /> Edit History
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── READ-ONLY INFO STRIP ─────────────────────────────────────── */}
          {tab === "edit" && (
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-6 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Star size={11} className="text-amber-400" />
                Performance score:{" "}
                <span className="font-semibold text-slate-700">{member.performance_score ?? "—"}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="italic text-slate-400">
                Name &amp; avatar are set by the member in their Settings.
              </span>
            </div>
          )}

          {tab === "edit" ? (
            <div className="p-6 space-y-5">

              {/* Job Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Experience Level</label>
                <div className="flex flex-wrap gap-2">
                  {EXP_LEVELS.map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExpLevel(lvl === expLevel ? "" : lvl)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        expLevel === lvl
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity + Years + Rate */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Capacity <span className="font-normal text-slate-400">(hrs/wk)</span>
                  </label>
                  <input
                    type="number" min={1} max={168}
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Controls AI assignment load</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Years of Exp.
                  </label>
                  <input
                    type="number" min={0} max={50}
                    value={yearsExp}
                    onChange={e => setYearsExp(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Hourly Rate <span className="font-normal text-slate-400">($)</span>
                  </label>
                  <input
                    type="number" min={0}
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Used in cost analytics</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Skills</label>
                  <button
                    type="button"
                    onClick={() => setShowSkillPicker(v => !v)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={12} /> Add from list
                    <ChevronDown size={11} className={`transition-transform ${showSkillPicker ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Current skills */}
                <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                  {skills.length === 0 && (
                    <span className="text-xs text-slate-400 self-center px-1">No skills added</span>
                  )}
                  {skills.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
                      {s}
                      <button type="button" onClick={() => toggleSkill(s)} className="hover:text-red-500 transition-colors ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Skill picker */}
                {showSkillPicker && (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-white border border-slate-200 rounded-xl mb-2">
                    {COMMON_SKILLS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                          skills.includes(s)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom skill input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={e => setCustomSkill(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                    placeholder="Type a custom skill and press Enter…"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={14} className="flex-shrink-0" /> {error}
                </div>
              )}
            </div>
          ) : (
            /* ── HISTORY TAB ──────────────────────────────────────────────── */
            <div className="p-6">
              {historyLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-indigo-400" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No edits recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Changes you make will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Last {history.length} changes
                  </p>
                  {history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Briefcase size={12} className="text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{h.field}</p>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                            <Clock size={9} /> {timeAgo(h.changed_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-md font-mono truncate max-w-[140px]">
                            {h.old_value || "—"}
                          </span>
                          <span className="text-slate-300 text-xs">→</span>
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-mono truncate max-w-[140px]">
                            {h.new_value || "—"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">by {h.changed_by_name || "Unknown"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {tab === "edit" && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : saved ? (
                <><CheckCircle2 size={14} /> Saved!</>
              ) : (
                <><Save size={14} /> Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
