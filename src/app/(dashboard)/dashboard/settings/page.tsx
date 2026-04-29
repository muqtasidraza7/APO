"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "../../../utils/supabase/client";
import { updateSkillProfile } from "../../../onboarding/action";
import {
    Settings,
    Brain,
    Upload,
    FileText,
    X,
    Plus,
    Loader2,
    CheckCircle2,
    Save,
    User,
    KeyRound,
} from "lucide-react";
import { motion } from "framer-motion";

interface SkillProfile {
    user_skills: string[];
    job_title: string;
    experience_level: string;
    years_of_experience: number;
    user_cv_url: string;
}

const EXP_LEVELS = ["Junior", "Mid-Level", "Senior", "Lead", "Executive"];

export default function SettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState("");

    const [userEmail, setUserEmail] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [isChangingPwd, setIsChangingPwd] = useState(false);
    const [pwdMessage, setPwdMessage] = useState({ type: "", text: "" });

    const [skills, setSkills] = useState<string[]>([]);
    const [jobTitle, setJobTitle] = useState("");
    const [expLevel, setExpLevel] = useState("");
    const [yearsExp, setYearsExp] = useState<number | "">("");
    const [customSkill, setCustomSkill] = useState("");

    const [cvFile, setCvFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email || "");

            const { data } = await supabase
                .from("workspace_members")
                .select("user_skills, job_title, experience_level, years_of_experience, user_cv_url")
                .eq("user_id", user.id)
                .single();

            if (data) {
                setSkills(data.user_skills || []);
                setJobTitle(data.job_title || "");
                setExpLevel(data.experience_level || "");
                setYearsExp(data.years_of_experience || "");
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    const removeSkill = (skill: string) => setSkills(prev => prev.filter(s => s !== skill));

    const addCustomSkill = () => {
        const trimmed = customSkill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills(prev => [...prev, trimmed]);
            setCustomSkill("");
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setParseError("Please upload a PDF file.");
            return;
        }
        setCvFile(file);
        setParseError("");
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, []);

    const handleExtractFromCV = async () => {
        if (!cvFile) return;
        setIsParsing(true);
        setParseError("");
        try {
            const formData = new FormData();
            formData.append("cv", cvFile);
            const response = await fetch("/api/parse-cv", { method: "POST", body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setSkills(data.skills || []);
            if (data.job_title) setJobTitle(data.job_title);
            if (data.experience_level) setExpLevel(data.experience_level);
            if (data.years_of_experience) setYearsExp(data.years_of_experience);
            setCvFile(null);
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

        const result = await updateSkillProfile({
            skills,
            job_title: jobTitle,
            experience_level: expLevel,
            years_of_experience: yearsExp ? Number(yearsExp) : undefined,
        });

        if (result?.error) {
            setSaveError(result.error);
        } else {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (!passwordInput || passwordInput !== passwordConfirm) {
            setPwdMessage({ type: "error", text: "Passwords must match and cannot be empty." });
            return;
        }
        if (passwordInput.length < 6) {
            setPwdMessage({ type: "error", text: "Password must be at least 6 characters." });
            return;
        }

        setIsChangingPwd(true);
        setPwdMessage({ type: "", text: "" });

        const { error } = await supabase.auth.updateUser({ password: passwordInput });

        if (error) {
            setPwdMessage({ type: "error", text: error.message });
        } else {
            setPwdMessage({ type: "success", text: "Password updated successfully!" });
            setPasswordInput("");
            setPasswordConfirm("");
        }
        setIsChangingPwd(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={36} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Account</p>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            </div>

            {/* Skill Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Brain size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Your Skill Profile</h2>
                        <p className="text-sm text-slate-500">Used by AI to auto-assign tasks that match your expertise</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Re-upload CV */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700">Re-scan with CV</label>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${isDragging ? "border-[var(--color-accent)] bg-indigo-50" :
                                    cvFile ? "border-green-400 bg-green-50" :
                                        "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
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
                                    <FileText size={20} className="text-green-600" />
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900 text-sm">{cvFile.name}</p>
                                        <p className="text-xs text-slate-500">{(cvFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                    <Upload size={16} />
                                    <span>Drop CV PDF here or <span className="text-[var(--color-accent)]">browse</span></span>
                                </div>
                            )}
                        </div>

                        {parseError && <p className="text-xs text-red-600">{parseError}</p>}

                        {cvFile && (
                            <button
                                onClick={handleExtractFromCV}
                                disabled={isParsing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {isParsing ? <><Loader2 size={16} className="animate-spin" /> Extracting...</> : <><Brain size={16} /> Extract &amp; Update Skills</>}
                            </button>
                        )}
                    </div>

                    {/* Job Title */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Job Title</label>
                        <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Senior Frontend Developer"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                        />
                    </div>

                    {/* Experience */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Experience Level</label>
                            <div className="flex flex-wrap gap-2">
                                {EXP_LEVELS.map((lvl) => (
                                    <button
                                        key={lvl}
                                        type="button"
                                        onClick={() => setExpLevel(lvl)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${expLevel === lvl
                                                ? "bg-[var(--color-accent)] text-white"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Years of Experience</label>
                            <input
                                type="number"
                                value={yearsExp}
                                onChange={(e) => setYearsExp(e.target.value ? Number(e.target.value) : "")}
                                placeholder="e.g. 5"
                                min={0} max={50}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                            />
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                            Skills <span className="font-normal text-slate-400">({skills.length})</span>
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[64px]">
                            {skills.length === 0 && (
                                <p className="text-sm text-slate-400 m-auto">No skills yet — upload a CV or add manually</p>
                            )}
                            {skills.map((skill) => (
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

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customSkill}
                                onChange={(e) => setCustomSkill(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                                placeholder="Add a skill..."
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                            />
                            <button
                                type="button"
                                onClick={addCustomSkill}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <Plus size={16} className="text-slate-600" />
                            </button>
                        </div>
                    </div>

                    {saveError && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5 border border-red-100">{saveError}</p>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {saving ? (
                            <><Loader2 size={18} className="animate-spin" /> Saving...</>
                        ) : saveSuccess ? (
                            <><CheckCircle2 size={18} /> Saved!</>
                        ) : (
                            <><Save size={18} /> Save Skill Profile</>
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Account & Security Card */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <User size={20} className="text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Account &amp; Security</h2>
                        <p className="text-sm text-slate-500">Manage your login credentials</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="text-sm font-semibold text-slate-700">Email Address</label>
                        <input
                            type="email"
                            value={userEmail}
                            disabled
                            className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-2">Email changes must be requested through your administrator.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6 space-y-4">
                        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                            <KeyRound size={16} className="text-slate-400" /> Change Password
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600">New Password</label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    className="w-full mt-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600">Confirm Password</label>
                                <input
                                    type="password"
                                    value={passwordConfirm}
                                    onChange={(e) => setPasswordConfirm(e.target.value)}
                                    className="w-full mt-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                />
                            </div>
                        </div>

                        {pwdMessage.text && (
                            <div className={`p-3 text-sm rounded-xl ${pwdMessage.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                                {pwdMessage.text}
                            </div>
                        )}

                        <button
                            onClick={handleChangePassword}
                            disabled={isChangingPwd || !passwordInput}
                            className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isChangingPwd ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            Update Password
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
