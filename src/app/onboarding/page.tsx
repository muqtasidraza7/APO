"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  FileText,
  X,
  Plus,
  Brain,
  ChevronRight,
  Link as LinkIcon
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createWorkspace, joinWorkspace } from "./action";

interface SkillProfile {
  skills: string[];
  job_title: string;
  experience_level: string;
  years_of_experience: number;
  summary: string;
}

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"create" | "join">(inviteCode ? "join" : "create");
  const [workspaceName, setWorkspaceName] = useState("");
  const [joinWorkspaceId, setJoinWorkspaceId] = useState(inviteCode || "");

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [skillProfile, setSkillProfile] = useState<SkillProfile | null>(null);
  const [editedSkills, setEditedSkills] = useState<string[]>([]);
  const [editedJobTitle, setEditedJobTitle] = useState("");
  const [editedExpLevel, setEditedExpLevel] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inviteCode) {
      setWorkspaceMode("join");
      setJoinWorkspaceId(inviteCode);
    }
  }, [inviteCode]);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceMode === "create" && !workspaceName.trim()) return;
    if (workspaceMode === "join" && !joinWorkspaceId.trim()) return;
    setStep(2);
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setParseError("Please upload a PDF file.");
      return;
    }
    setCvFile(file);
    setParseError("");
    setSkillProfile(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleExtractSkills = async () => {
    if (!cvFile) return;
    setIsParsing(true);
    setParseError("");

    try {
      const formData = new FormData();
      formData.append("cv", cvFile);

      const response = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to parse CV");

      setSkillProfile(data);
      setEditedSkills(data.skills || []);
      setEditedJobTitle(data.job_title || "");
      setEditedExpLevel(data.experience_level || "");
    } catch (err: any) {
      setParseError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const removeSkill = (skill: string) => {
    setEditedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !editedSkills.includes(trimmed)) {
      setEditedSkills((prev) => [...prev, trimmed]);
      setCustomSkill("");
    }
  };

  const handleFinish = async (skipCv = false) => {
    setIsLoading(true);

    const profile = skipCv || !skillProfile
      ? undefined
      : {
        skills: editedSkills,
        job_title: editedJobTitle,
        experience_level: editedExpLevel,
        years_of_experience: skillProfile.years_of_experience,
      };

    if (workspaceMode === "create") {
      const result = await createWorkspace(workspaceName, profile);
      if (result?.error) {
        alert(result.error);
        setIsLoading(false);
      }
    } else {
      const result = await joinWorkspace(joinWorkspaceId, profile);
      if (result?.error) {
        alert(result.error);
        setIsLoading(false);
      }
    }
  };

  const expLevels = ["Junior", "Mid-Level", "Senior", "Lead", "Executive"];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-100 w-full">
          <motion.div
            className="h-full bg-[var(--color-accent)]"
            initial={{ width: "50%" }}
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-0 px-8">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 1 ? "text-[var(--color-accent)]" : "text-slate-300"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 1 ? "bg-[var(--color-accent)] text-white" : "bg-slate-200 text-slate-400"}`}>1</div>
            Workspace
          </div>
          <ChevronRight size={14} className="text-slate-300" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= 2 ? "text-[var(--color-accent)]" : "text-slate-400"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= 2 ? "bg-[var(--color-accent)] text-white" : "bg-slate-200 text-slate-400"}`}>2</div>
            Your Profile
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="p-8 md:p-10"
            >
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-[var(--color-accent)] mb-6 mx-auto shadow-sm">
                <Building2 size={28} />
              </div>

              <div className="text-center mb-7">
                <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Your Workspace</h1>
                <p className="text-slate-500 text-sm">Create a new workspace or join an existing one.</p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("create")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    workspaceMode === "create" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Create New
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode("join")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    workspaceMode === "join" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Join Existing
                </button>
              </div>

              <form onSubmit={handleStep1Next} className="space-y-5">
                {workspaceMode === "create" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Workspace Name</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          placeholder="e.g. Acme Agency, Project Alpha"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-slate-900 placeholder:text-slate-300 shadow-sm"
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[var(--color-accent)] transition-colors">
                          <Sparkles size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                        <span>You will be the <strong>Admin (PM)</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                        <span>Invite <strong>Workers</strong> &amp; <strong>Clients</strong> later</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Workspace ID or Invite Link</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={joinWorkspaceId}
                          onChange={(e) => {
                            const val = e.target.value;
                            try {
                              const url = new URL(val);
                              const invite = url.searchParams.get("invite");
                              setJoinWorkspaceId(invite ? invite.trim() : val);
                            } catch {
                              setJoinWorkspaceId(val);
                            }
                          }}
                          placeholder="Paste invite link or workspace ID..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-slate-900 placeholder:text-slate-300 shadow-sm"
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[var(--color-accent)] transition-colors">
                          <LinkIcon size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                        <span>You will join as a <strong>Worker</strong></span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                        <span>Contribute to projects &amp; tasks</span>
                      </div>
                    </div>
                  </>
                )}

                <button
                  disabled={workspaceMode === "create" ? !workspaceName.trim() : !joinWorkspaceId.trim()}
                  className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Next — Set Up Your Profile
                  <ArrowRight size={18} />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3 }}
              className="p-8 md:p-10"
            >
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-[var(--color-accent)] mb-6 mx-auto shadow-sm">
                <Brain size={28} />
              </div>

              <div className="text-center mb-7">
                <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Upload Your CV</h1>
                <p className="text-slate-500 text-sm">
                  Our AI will read your CV and automatically assign your skills, so the system knows what you're great at.
                </p>
              </div>

              <div className="space-y-5">
                {/* Dropzone */}
                {!skillProfile && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                        ? "border-[var(--color-accent)] bg-indigo-50"
                        : cvFile
                          ? "border-green-400 bg-green-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                    {cvFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText size={24} className="text-green-600" />
                        <div className="text-left">
                          <p className="font-semibold text-slate-900 text-sm">{cvFile.name}</p>
                          <p className="text-xs text-slate-500">{(cvFile.size / 1024).toFixed(1)} KB — Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={28} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-700">Drop your CV here or <span className="text-[var(--color-accent)]">browse</span></p>
                        <p className="text-xs text-slate-400 mt-1">PDF only · Max 10MB</p>
                      </>
                    )}
                  </div>
                )}

                {parseError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-100">{parseError}</p>
                )}

                {/* Extract Button */}
                {cvFile && !skillProfile && (
                  <button
                    onClick={handleExtractSkills}
                    disabled={isParsing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        AI is reading your CV...
                      </>
                    ) : (
                      <>
                        <Brain size={18} />
                        Extract Skills with AI
                      </>
                    )}
                  </button>
                )}

                {/* Extracted Profile Preview */}
                {skillProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-2.5 border border-green-100">
                      <CheckCircle2 size={16} className="flex-shrink-0" />
                      <p className="text-sm font-medium">AI extracted your profile — review and confirm below</p>
                    </div>

                    {/* Job Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Job Title</label>
                      <input
                        type="text"
                        value={editedJobTitle}
                        onChange={(e) => setEditedJobTitle(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                      />
                    </div>

                    {/* Experience Level */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Experience Level</label>
                      <div className="flex flex-wrap gap-2">
                        {expLevels.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setEditedExpLevel(lvl)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${editedExpLevel === lvl
                                ? "bg-[var(--color-accent)] text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Skills <span className="font-normal text-slate-400 normal-case">({editedSkills.length} extracted)</span>
                      </label>
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[60px]">
                        {editedSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100 shadow-sm"
                          >
                            {skill}
                            <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Add custom skill */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customSkill}
                          onChange={(e) => setCustomSkill(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                          placeholder="Add a skill..."
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                        />
                        <button
                          type="button"
                          onClick={addCustomSkill}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Plus size={14} className="text-slate-600" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleFinish(false)}
                      disabled={isLoading}
                      className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} />Confirm &amp; Enter Dashboard</>}
                    </button>
                  </motion.div>
                )}

                {/* Skip */}
                {!skillProfile && (
                  <button
                    type="button"
                    onClick={() => handleFinish(true)}
                    disabled={isLoading}
                    className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-1 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    Skip for now — I&apos;ll add skills later in Settings
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}>
      <OnboardingForm />
    </Suspense>
  );
}
