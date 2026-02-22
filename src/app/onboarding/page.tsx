"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createWorkspace } from "./action";

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setIsLoading(true);

    const result = await createWorkspace(workspaceName);

    if (result?.error) {
      alert(result.error); 
      setIsLoading(false);
    } else {

    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        
        <div className="h-1 bg-slate-100 w-full">
          <div className="h-full bg-[var(--color-accent)] w-1/2"></div>
        </div>

        <div className="p-8 md:p-12">
          
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-[var(--color-accent)] mb-8 mx-auto shadow-sm">
            <Building2 size={32} />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Let's set up your HQ
            </h1>
            <p className="text-slate-500">
              Create a workspace to manage your projects, team, and clients.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                Workspace Name
              </label>
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
              <p className="text-xs text-slate-400 ml-1">
                This will be the home for your team. You can change it later.
              </p>
            </div>

            {/* Feature Highlights (Just for UX confidence) */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>
                  You will be the <strong>Admin (PM)</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>
                  Invite <strong>Workers</strong> & <strong>Clients</strong>{" "}
                  later
                </span>
              </div>
            </div>

            <button
              disabled={isLoading || !workspaceName.trim()}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Create Workspace
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
