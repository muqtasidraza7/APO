"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { signup } from "../action";
import { useState } from "react";
import { OAuthButtons } from "../OAuthButtons";

const REQUIREMENTS = [
  { label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",    test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",    test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character",  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const allMet = REQUIREMENTS.every((r) => r.test(password));
  const passwordsMatch = password === confirm && confirm.length > 0;

  const handleSubmit = async (formData: FormData) => {
    if (!allMet) { setErrorMessage("Please meet all password requirements."); return; }
    if (!passwordsMatch) { setErrorMessage("Passwords do not match."); return; }

    setIsLoading(true);
    setErrorMessage("");

    const result = await signup(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      if (result.confirmed) {
        window.location.href = "/onboarding";
      } else {
        setEmailSent(true);
        setIsLoading(false);
      }
    }
  };

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
      >
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verify your email</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              We've sent a confirmation link to your email. Click it to activate your account, then come back to sign in.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Go to Sign In <ArrowRight size={15} />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h1>
        <p className="text-slate-500 text-sm">Start automating your projects today.</p>
      </div>

      <OAuthButtons />

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">

        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 ml-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Your full name"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-sm text-slate-900"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-sm text-slate-900"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Live requirements */}
          {password.length > 0 && (
            <ul className="mt-2 space-y-1 pl-1">
              {REQUIREMENTS.map((r) => {
                const met = r.test(password);
                return (
                  <li key={r.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${met ? "text-green-600" : "text-slate-400"}`}>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${met ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
                      {met && <svg viewBox="0 0 10 10" className="w-2 h-2"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 ml-1">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
          disabled={isLoading || !allMet || !passwordsMatch}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>Create Account <ArrowRight size={18} /></>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-8">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-accent)] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
