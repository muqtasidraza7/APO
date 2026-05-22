"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Compass,
  RotateCcw,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

interface Message {
  role: "user" | "ai";
  content: string;
}

type Category = "all" | "performance" | "behavioral" | "assignment" | "future";

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "all",         label: "All Topics",     icon: <Brain size={14} />,     color: "bg-indigo-600 text-white" },
  { id: "performance", label: "Performance",    icon: <TrendingUp size={14} />, color: "bg-emerald-600 text-white" },
  { id: "behavioral",  label: "Behavioral",     icon: <Users size={14} />,      color: "bg-violet-600 text-white" },
  { id: "assignment",  label: "Assignments",    icon: <Target size={14} />,     color: "bg-amber-600 text-white" },
  { id: "future",      label: "Future Steps",   icon: <Compass size={14} />,    color: "bg-rose-600 text-white" },
];

const SUGGESTED: Record<Category, string[]> = {
  all: [
    "Give me a full team health summary",
    "Who are the highest and lowest performers this sprint cycle?",
    "Which projects are at risk based on current team load and patterns?",
  ],
  performance: [
    "Who has the highest task completion rate across all sprints?",
    "Which team member has had the most performance issues?",
    "How has our sprint velocity changed over recent sprints?",
  ],
  behavioral: [
    "Which team members work best together?",
    "Are there any team members I should avoid pairing?",
    "What did our last sprint retrospective reveal about collaboration?",
  ],
  assignment: [
    "Why was a particular person assigned to their current milestone?",
    "Who should I assign to a new backend milestone?",
    "Why aren't certain members assigned to the current sprint?",
  ],
  future: [
    "What should the team focus on next sprint?",
    "Which team member is most ready for a high-priority milestone?",
    "What patterns should I address before the next sprint cycle?",
  ],
};

export default function InsightsPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member?.workspace_id) return;

      // Check if admin (owner or PM)
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", member.workspace_id)
        .maybeSingle();

      const adminFlag = ws?.owner_id === user.id || member.role === "pm";

      if (!adminFlag) {
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);
      setWorkspaceId(member.workspace_id);
    };
    loadWorkspace();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleAsk = async (q?: string) => {
    const finalQ = (q || question).trim();
    if (!finalQ || !workspaceId || loading) return;

    setMessages(prev => [...prev, { role: "user", content: finalQ }]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalQ, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get answer");
      setMessages(prev => [...prev, { role: "ai", content: data.answer }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError("");
    inputRef.current?.focus();
  };

  const suggested = SUGGESTED[activeCategory];
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  // Loading state while role is being determined
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Access restricted for members
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={36} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          AI Insights provides intelligence about team performance and assignments. This is an admin-only feature available to project managers and workspace owners.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Insights</h1>
            <p className="text-sm text-slate-500">Ask anything about your team's performance, behavior, and assignments</p>
          </div>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 flex-wrap mb-4 flex-shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeCategory === cat.id
                ? `${cat.color} border-transparent shadow-sm`
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 border border-slate-200 hover:border-red-300 hover:text-red-600 transition-all ml-auto"
          >
            <RotateCcw size={12} />
            Clear chat
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

        {/* Messages / Empty State */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="space-y-6">
              {/* Intro Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center">
                    <Sparkles size={18} className="text-indigo-300" />
                  </div>
                  <div>
                    <p className="font-bold">Project Intelligence Advisor</p>
                    <p className="text-xs text-indigo-300/80">Powered by sprint data, behavioral patterns &amp; team history</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  I have full visibility into your team's sprint completions, behavioral patterns from retrospectives,
                  assignment reasoning, and performance scores. Ask me anything — I'll give you specific, data-backed answers.
                </p>
              </div>

              {/* Suggested Questions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${activeCat.color}`}>
                    {activeCat.icon}
                    {activeCat.label}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">Suggested questions</p>
                </div>
                <div className="grid gap-2">
                  {suggested.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(s)}
                      disabled={loading || !workspaceId}
                      className="flex items-center gap-3 text-left px-4 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-sm text-slate-700 hover:text-indigo-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={14} className="text-indigo-400 flex-shrink-0" />
                      <span className="flex-1">{s}</span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm shadow-sm"
                        : "bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Loader2 size={14} className="text-white animate-spin" />
                  </div>
                  <div className="px-4 py-3 bg-slate-50 rounded-2xl rounded-tl-sm border border-slate-200">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick follow-up suggestions after conversation starts */}
              {!loading && messages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {suggested.slice(0, 2).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(s)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-full text-xs text-slate-600 hover:text-indigo-700 transition-all disabled:opacity-50"
                    >
                      <Sparkles size={11} className="text-indigo-400" />
                      {s.length > 48 ? s.slice(0, 48) + "…" : s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-slate-100 p-4 flex-shrink-0">
          {!workspaceId && (
            <p className="text-xs text-amber-600 mb-3 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Loading workspace context…
            </p>
          )}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && handleAsk()}
              placeholder="Ask about performance, behavior, assignments, or next steps…"
              disabled={loading || !workspaceId}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-50 transition-all"
            />
            <button
              onClick={() => handleAsk()}
              disabled={loading || !question.trim() || !workspaceId}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2 font-medium shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Answers draw from sprint history, behavioral patterns, and team assignments across your workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
