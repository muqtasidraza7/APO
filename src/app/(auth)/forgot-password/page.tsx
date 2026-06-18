"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { resetPasswordForEmail } from "../action";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    const email = formData.get("email") as string;
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;

    const result = await resetPasswordForEmail(email, redirectTo);

    if (result?.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-slate-500 text-sm">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center gap-4 py-4"
        >
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">Check your email</p>
            <p className="text-sm text-slate-500">
              If an account exists for that address, a reset link has been sent. Check your spam folder if you don't see it.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-2 text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            Back to sign in
          </Link>
        </motion.div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-5">
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
                  autoFocus
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all text-sm text-slate-900"
                />
              </div>
            </div>

            <button
              disabled={isLoading}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Send Reset Link
                  <Send size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--color-accent)] transition-colors"
            >
              <ArrowLeft size={15} />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
