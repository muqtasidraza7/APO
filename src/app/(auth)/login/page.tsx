"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation"; // To read ?message=
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { login } from "../action"; // Make sure file is named actions.ts
import { useState, Suspense } from "react";
import { OAuthButtons } from "../OAuthButtons";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const searchParams = useSearchParams();
  const flashMessage = searchParams.get("message");

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setErrorMessage("");

    const result = await login(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    }
    // On success, the server action redirects, so we keep loading true
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
        <p className="text-slate-500 text-sm">
          Enter your credentials to access your workspace.
        </p>
      </div>

      {/* Social Login Buttons */}
      <OAuthButtons />

      {/* Flash Message (Success) */}
      {flashMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <span>{flashMessage}</span>
        </div>
      )}

      {/* Error Message (Failure) */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 ml-1">
            Email Address
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-medium text-slate-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-sm text-slate-900"
            />
          </div>
        </div>

        <button
          disabled={isLoading}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              Sign In
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-8">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="text-[var(--color-accent)] font-semibold hover:underline"
        >
          Create account
        </Link>
      </p>
    </motion.div>
  );
}

// Wrap in Suspense because we use useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
