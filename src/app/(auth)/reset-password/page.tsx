"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { updatePassword } from "../action";

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",           test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const allMet = REQUIREMENTS.every((r) => r.test(password));
  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = allMet && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("password", password);
    const result = await updatePassword(fd);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setDone(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Set New Password</h1>
        <p className="text-slate-500 text-sm">Choose a strong password for your account.</p>
      </div>

      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center gap-4 py-4"
        >
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">Password updated</p>
            <p className="text-sm text-slate-500">You can now sign in with your new password.</p>
          </div>
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Sign In <ArrowRight size={15} />
          </Link>
        </motion.div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-sm text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Requirements */}
              {password.length > 0 && (
                <ul className="mt-2 space-y-1 pl-1">
                  {REQUIREMENTS.map((r) => {
                    const met = r.test(password);
                    return (
                      <li key={r.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${met ? "text-green-600" : "text-slate-400"}`}>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${met ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
                          {met && <svg viewBox="0 0 10 10" className="w-2 h-2 fill-white"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all text-sm text-slate-900 ${
                    confirm.length > 0
                      ? passwordsMatch
                        ? "border-green-400 focus:border-green-400"
                        : "border-red-300 focus:border-red-400"
                      : "border-slate-200 focus:border-[var(--color-accent)]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-red-500 ml-1">Passwords do not match</p>
              )}
            </div>

            <button
              disabled={!canSubmit}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>Update Password <ArrowRight size={16} /></>}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
}
