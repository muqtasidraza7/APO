"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useState } from "react";


export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setMessage(null);

    // Placeholder for actual logic:
    // const result = await resetPassword(formData);

    // Simulating API call for UI purposes
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Logic to handle success/error would go here
    setMessage({
      text: "If an account exists, a reset link has been sent.",
      type: "success",
    });
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Reset Password
        </h1>
        <p className="text-slate-500 text-sm">
          Enter your email and we'll send you instructions to reset your
          password.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 border text-sm rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
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

        <button
          disabled={isLoading}
          className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              Send Reset Link
              <Send size={18} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[var(--color-accent)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </motion.div>
  );
}
