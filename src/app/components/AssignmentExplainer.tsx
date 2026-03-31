"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react";

interface AssignmentExplainerProps {
    workspaceId: string;
}

interface Message {
    role: "user" | "ai";
    content: string;
}

export default function AssignmentExplainer({ workspaceId }: AssignmentExplainerProps) {
    const [expanded, setExpanded] = useState(false);
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    const SUGGESTED = [
        "Why wasn't the Frontend Developer assigned to the database task?",
        "Who should I avoid pairing together?",
        "Which team member has the most unresolved performance issues?",
    ];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleAsk = async (q?: string) => {
        const finalQuestion = q || question.trim();
        if (!finalQuestion) return;

        setMessages(prev => [...prev, { role: "user", content: finalQuestion }]);
        setQuestion("");
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/explain-assignment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: finalQuestion, workspaceId }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setMessages(prev => [...prev, { role: "ai", content: data.answer }]);
        } catch (err: any) {
            setError(err.message || "Failed to get an answer. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
                        <MessageCircle size={20} className="text-indigo-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white">Assignment Intelligence Query</h3>
                        <p className="text-sm text-indigo-300/70">Ask AI why certain people were or weren't assigned</p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp size={18} className="text-indigo-400" />
                ) : (
                    <ChevronDown size={18} className="text-indigo-400" />
                )}
            </button>

            {expanded && (
                <div className="px-5 pb-5 space-y-4">
                    {/* Conversation */}
                    {messages.length === 0 ? (
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                                Suggested Questions
                            </p>
                            {SUGGESTED.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAsk(s)}
                                    className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors flex items-center gap-3"
                                >
                                    <Sparkles size={14} className="text-indigo-400 flex-shrink-0" />
                                    {s}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {msg.role === "ai" && (
                                        <div className="w-7 h-7 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Sparkles size={13} className="text-indigo-400" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                                            msg.role === "user"
                                                ? "bg-indigo-600 text-white rounded-tr-sm"
                                                : "bg-white/10 text-slate-200 rounded-tl-sm border border-white/10"
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3 justify-start">
                                    <div className="w-7 h-7 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Loader2 size={13} className="text-indigo-400 animate-spin" />
                                    </div>
                                    <div className="px-4 py-3 bg-white/10 rounded-xl rounded-tl-sm border border-white/10">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                            <X size={14} />
                            {error}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !loading && handleAsk()}
                            placeholder="Ask why someone wasn't assigned..."
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <button
                            onClick={() => handleAsk()}
                            disabled={loading || !question.trim()}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>

                    {messages.length > 0 && (
                        <button
                            onClick={() => setMessages([])}
                            className="text-xs text-indigo-400/60 hover:text-indigo-400 transition-colors"
                        >
                            Clear conversation
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
