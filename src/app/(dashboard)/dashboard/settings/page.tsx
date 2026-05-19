"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import {
  Brain, Shield, SlidersHorizontal, Upload, FileText, X, Plus,
  Loader2, CheckCircle2, User, KeyRound, Bell, Clock,
  Cpu, ArrowRight, Activity, TrendingUp, Zap, CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── SVG Components ────────────────────────────────────────────────────────────

function CompletenessRing({ percent }: { percent: number }) {
  const r = 26, cx = 32, cy = 32;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={5} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="white" strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="white">
        {percent}
      </text>
    </svg>
  );
}

function PerformanceGauge({ score }: { score: number }) {
  const r = 44, cx = 55, cy = 58;
  const circ = 2 * Math.PI * r;
  const track = circ * 0.75;
  const progress = Math.max(0, Math.min(1, score / 100)) * track;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Low";

  return (
    <svg width={110} height={100} viewBox="0 0 110 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={7}
        strokeDasharray={`${track} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${progress} ${circ}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="800" fill="white">
        {score}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={color} letterSpacing="0.5">
        {label.toUpperCase()}
      </text>
    </svg>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function completeness(name: string, title: string, skills: string[], exp: string, years: any, cap: any) {
  const checks = [!!name?.trim(), !!title?.trim(), skills.length >= 3, !!exp, !!years, !!cap];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const EXP_LEVELS = ["Junior", "Mid-Level", "Senior", "Lead", "Executive"];

type Tab = "profile" | "security" | "preferences";

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Profile state
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [yearsExp, setYearsExp] = useState<number | "">("");
  const [capacityHours, setCapacityHours] = useState<number | "">(40);
  const [customSkill, setCustomSkill] = useState("");

  // AI health
  const [perfScore, setPerfScore] = useState(100);
  const [sprintRate, setSprintRate] = useState("...");
  const [milestoneRate, setMilestoneRate] = useState("...");

  // Save
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // CV
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [cvExtracted, setCvExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdChanging, setPwdChanging] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });

  // Prefs
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyRisks, setNotifyRisks] = useState(true);
  const [notifySprints, setNotifySprints] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.email || "");
        setAvatarUrl(d.avatar_url || null);
        setFullName(d.full_name || "");
        setSkills(d.skills || []);
        setJobTitle(d.job_title || "");
        setExpLevel(d.experience_level || "");
        setYearsExp(d.years_of_experience || "");
        setCapacityHours(d.capacity_hours_per_week ?? 40);
        setPerfScore(d.performance_score ?? 100);
        setSprintRate(d.sprint_completion || "No sprint history");
        setMilestoneRate(d.milestone_completion || "No milestone history");
        setNotifyTasks(d.notify_tasks ?? true);
        setNotifyRisks(d.notify_risks ?? true);
        setNotifySprints(d.notify_sprints ?? true);
        setNotifyMentions(d.notify_mentions ?? true);
      })
      .finally(() => setLoading(false));
  }, []);

  const complete = completeness(fullName, jobTitle, skills, expLevel, yearsExp, capacityHours);

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setParseError("PDF files only."); return; }
    setCvFile(file);
    setParseError("");
    setCvExtracted(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleExtractCV = async () => {
    if (!cvFile) return;
    setIsParsing(true);
    setParseError("");
    try {
      const fd = new FormData();
      fd.append("cv", cvFile);
      const res = await fetch("/api/parse-cv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.skills?.length) setSkills(data.skills);
      if (data.job_title) setJobTitle(data.job_title);
      if (data.experience_level) setExpLevel(data.experience_level);
      if (data.years_of_experience) setYearsExp(data.years_of_experience);
      setCvFile(null);
      setCvExtracted(true);
      setTimeout(() => setCvExtracted(false), 4000);
    } catch (err: any) {
      setParseError(err.message || "Failed to parse CV");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          skills,
          job_title: jobTitle,
          experience_level: expLevel,
          years_of_experience: yearsExp || null,
          capacity_hours_per_week: capacityHours || null,
          notify_tasks: notifyTasks,
          notify_risks: notifyRisks,
          notify_sprints: notifySprints,
          notify_mentions: notifyMentions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePwd = async () => {
    if (!pwdNew || pwdNew !== pwdConfirm) {
      setPwdMsg({ type: "error", text: "Passwords must match." }); return;
    }
    if (pwdNew.length < 6) {
      setPwdMsg({ type: "error", text: "Minimum 6 characters." }); return;
    }
    setPwdChanging(true);
    const { error } = await supabase.auth.updateUser({ password: pwdNew });
    if (error) {
      setPwdMsg({ type: "error", text: error.message });
    } else {
      setPwdMsg({ type: "success", text: "Password updated!" });
      setPwdNew(""); setPwdConfirm("");
    }
    setPwdChanging(false);
  };

  // Avatar initials
  const initials = fullName
    ? fullName.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
            <Cpu size={22} className="text-white" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading your command center…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-800 p-7">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-8 left-1/3 w-40 h-40 rounded-full bg-violet-400/10 blur-2xl" />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center">
                <Cpu size={18} className="text-white" />
              </div>
              <span className="text-white/60 text-xs font-bold tracking-[3px] uppercase">Control Panel</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Command Center</h1>
            <p className="text-white/55 mt-1 text-sm">Your AI profile, security and workspace preferences</p>
          </div>

          <div className="hidden sm:flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-3.5">
            <div className="text-right">
              <p className="text-white/55 text-[10px] font-bold tracking-widest uppercase">Profile</p>
              <p className="text-white font-black text-xl leading-tight">Complete</p>
            </div>
            <CompletenessRing percent={complete} />
          </div>
        </div>
      </div>

      {/* ── Body: Two Columns ───────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: Sticky Profile Card ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col gap-4 w-[260px] flex-shrink-0 sticky top-24">

          {/* Identity card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-5 border border-slate-700/50 shadow-xl shadow-slate-900/20">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-4">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30 overflow-hidden">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <h3 className="font-bold text-white text-base leading-tight truncate w-full">
                {fullName || "—"}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 truncate w-full">
                {jobTitle || "No role set"}
              </p>
              {expLevel && (
                <span className="mt-2 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-500/30 uppercase tracking-wider">
                  {expLevel}
                </span>
              )}
            </div>

            {/* Skills preview */}
            <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
              {skills.slice(0, 5).map(s => (
                <span key={s} className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded-md font-medium">
                  {s}
                </span>
              ))}
              {skills.length > 5 && (
                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded-md font-medium">
                  +{skills.length - 5}
                </span>
              )}
              {skills.length === 0 && (
                <span className="text-slate-500 text-[10px]">No skills yet</span>
              )}
            </div>

            {/* Completeness bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">AI Readiness</span>
                <span className="text-[11px] font-bold text-white">{complete}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${complete}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* How AI Sees You */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-5 border border-slate-700/50 shadow-xl shadow-slate-900/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-violet-500/20 rounded-lg flex items-center justify-center">
                <Brain size={13} className="text-violet-400" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">How AI Sees You</p>
            </div>

            <div className="flex justify-center mb-3">
              <PerformanceGauge score={perfScore} />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity size={11} className="text-emerald-400" />
                  <span className="text-[10px] text-slate-400">Sprint rate</span>
                </div>
                <span className="text-[10px] font-bold text-white truncate ml-2 max-w-[100px]">{sprintRate.split(" ")[0]}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={11} className="text-indigo-400" />
                  <span className="text-[10px] text-slate-400">Milestone rate</span>
                </div>
                <span className="text-[10px] font-bold text-white truncate ml-2 max-w-[100px]">{milestoneRate.split(" ")[0]}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-amber-400" />
                  <span className="text-[10px] text-slate-400">Capacity</span>
                </div>
                <span className="text-[10px] font-bold text-white">{capacityHours || "—"}h/wk</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: Tab Content ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
            {(["profile", "security", "preferences"] as Tab[]).map((tab) => {
              const icons: Record<Tab, React.ReactNode> = {
                profile: <Brain size={15} />,
                security: <Shield size={15} />,
                preferences: <SlidersHorizontal size={15} />,
              };
              const labels: Record<Tab, string> = {
                profile: "AI Profile",
                security: "Security",
                preferences: "Preferences",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {icons[tab]}
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">

            {/* ── AI Profile Tab ─────────────────────────────────────────────── */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >

                {/* CV Scanner */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <Zap size={15} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm">CV Scanner</h2>
                      <p className="text-xs text-slate-400">Auto-extract skills and profile from your resume</p>
                    </div>
                    {cvExtracted && (
                      <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                        <CheckCheck size={12} /> Extracted!
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all group ${
                        isDragging ? "border-indigo-400 bg-indigo-50"
                          : cvFile ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file" accept=".pdf" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                      {cvFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <FileText size={18} className="text-emerald-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-900 text-sm">{cvFile.name}</p>
                            <p className="text-xs text-slate-400">{(cvFile.size / 1024).toFixed(1)} KB · Ready to extract</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCvFile(null); }}
                            className="ml-auto p-1 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <X size={14} className="text-slate-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-colors">
                            <Upload size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          </div>
                          <p className="text-sm text-slate-500">
                            Drop PDF resume here or <span className="text-indigo-600 font-semibold">browse</span>
                          </p>
                          <p className="text-xs text-slate-400">AI extracts skills, role & experience automatically</p>
                        </div>
                      )}
                    </div>

                    {parseError && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{parseError}</p>
                    )}

                    {cvFile && (
                      <button
                        onClick={handleExtractCV}
                        disabled={isParsing}
                        className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-indigo-500/20"
                      >
                        {isParsing
                          ? <><Loader2 size={16} className="animate-spin" /> Scanning CV…</>
                          : <><Brain size={16} /> Extract &amp; Fill Profile</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Identity */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                      <User size={16} className="text-slate-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm">Identity</h2>
                      <p className="text-xs text-slate-400">Your display name and professional details</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Display Name</label>
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Alex Johnson"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        />
                        <p className="text-[10px] text-slate-400">Shows on your team card</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Job Title</label>
                        <input
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Senior Frontend Developer"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Experience Level</label>
                        <div className="flex flex-wrap gap-1.5">
                          {EXP_LEVELS.map((lvl) => (
                            <button
                              key={lvl} type="button"
                              onClick={() => setExpLevel(lvl === expLevel ? "" : lvl)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                expLevel === lvl
                                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Years of Experience</label>
                        <input
                          type="number" min={0} max={50}
                          value={yearsExp}
                          onChange={(e) => setYearsExp(e.target.value ? Number(e.target.value) : "")}
                          placeholder="e.g. 5"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                        <Clock size={11} className="text-slate-400" /> Weekly Capacity (Hours)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range" min={1} max={80}
                          value={capacityHours || 40}
                          onChange={(e) => setCapacityHours(Number(e.target.value))}
                          className="flex-1 accent-indigo-600"
                        />
                        <div className="w-16 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 text-center">
                          {capacityHours}h
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">AI uses this to prevent overloading your task queue</p>
                    </div>
                  </div>
                </div>

                {/* Skills Lab */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                      <Activity size={15} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-slate-900 text-sm">Skill Stack</h2>
                      <p className="text-xs text-slate-400">AI matches tasks to your skills</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                      skills.length >= 3 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {skills.length} skill{skills.length !== 1 ? "s" : ""}
                      {skills.length < 3 ? " · add more" : " · great!"}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap gap-2 min-h-[56px] p-3 bg-slate-50 rounded-xl border border-slate-200">
                      {skills.length === 0 && (
                        <p className="text-sm text-slate-400 m-auto">No skills yet — upload CV or add below</p>
                      )}
                      {skills.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold shadow-sm">
                          {s}
                          <button
                            type="button"
                            onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={customSkill}
                        onChange={(e) => setCustomSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const t = customSkill.trim();
                            if (t && !skills.includes(t)) { setSkills(p => [...p, t]); setCustomSkill(""); }
                          }
                        }}
                        placeholder="Add a skill (press Enter)…"
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = customSkill.trim();
                          if (t && !skills.includes(t)) { setSkills(p => [...p, t]); setCustomSkill(""); }
                        }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 rounded-xl transition-all font-medium"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                {saveError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{saveError}</p>
                )}

                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-70 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm shadow-lg shadow-indigo-500/25 group"
                >
                  {saving ? (
                    <><Loader2 size={18} className="animate-spin" /> Syncing to AI…</>
                  ) : saveSuccess ? (
                    <><CheckCircle2 size={18} /> Synced! Team card updated.</>
                  ) : (
                    <>
                      <Brain size={18} className="group-hover:rotate-12 transition-transform" />
                      Sync to AI
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* ── Security Tab ────────────────────────────────────────────────── */}
            {activeTab === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                      <Shield size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm">Account &amp; Security</h2>
                      <p className="text-xs text-slate-400">Manage login credentials</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email Address</label>
                      <input
                        type="email" value={email} disabled
                        className="w-full mt-2 px-4 py-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-sm cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-400 mt-1.5">Email changes must be requested via your administrator.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <KeyRound size={15} className="text-slate-400" /> Change Password
                      </h3>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600">New Password</label>
                          <input
                            type="password" value={pwdNew}
                            onChange={(e) => setPwdNew(e.target.value)}
                            placeholder="Min. 6 characters"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600">Confirm Password</label>
                          <input
                            type="password" value={pwdConfirm}
                            onChange={(e) => setPwdConfirm(e.target.value)}
                            placeholder="Repeat password"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                          />
                        </div>
                      </div>

                      {pwdMsg.text && (
                        <div className={`px-4 py-3 rounded-xl text-sm border ${
                          pwdMsg.type === "error"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          {pwdMsg.text}
                        </div>
                      )}

                      <button
                        onClick={handleChangePwd}
                        disabled={pwdChanging || !pwdNew}
                        className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {pwdChanging ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Preferences Tab ──────────────────────────────────────────────── */}
            {activeTab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <SlidersHorizontal size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-sm">Preferences</h2>
                      <p className="text-xs text-slate-400">Notifications and display settings</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                        <Bell size={12} className="text-slate-400" /> Notifications
                      </h3>

                      {[
                        {
                          val: notifyTasks, set: setNotifyTasks,
                          title: "Task Assignments",
                          desc: "Alert when AI assigns you a new sprint task or milestone."
                        },
                        {
                          val: notifyRisks, set: setNotifyRisks,
                          title: "Dependency Risks",
                          desc: "Alert when you become a project bottleneck."
                        },
                        {
                          val: notifySprints, set: setNotifySprints,
                          title: "Sprint Events",
                          desc: "Alert when a sprint you're part of is closed."
                        },
                        {
                          val: notifyMentions, set: setNotifyMentions,
                          title: "Mentions",
                          desc: "Alert when someone @mentions you in a message."
                        },
                      ].map(({ val, set, title, desc }) => (
                        <div key={title} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                          </div>
                          <button
                            onClick={() => set(!val)}
                            className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${val ? "bg-indigo-600" : "bg-slate-200"}`}
                          >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Appearance</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {["Light", "Dark (soon)", "System"].map((t) => (
                          <button
                            key={t}
                            disabled={t !== "Light"}
                            onClick={() => {}}
                            className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                              t === "Light"
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-400 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
