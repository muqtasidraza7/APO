"use client";

import { useState, useCallback } from "react";
import {
  Activity, RefreshCw, Loader2, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Factor {
  name: string;
  score: number;
  status: "good" | "warn" | "bad";
  detail: string;
}

interface HealthData {
  score: number;
  status: "healthy" | "warning" | "critical";
  factors: Factor[];
  narrative: string;
  signals: {
    velocityTrend: "up" | "stable" | "down" | "none";
    overdueCount: number;
    activeSprintCount: number;
    timelineDeviation: number;
  };
  computedAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  healthy: {
    label: "Healthy",
    ring: "#10b981",
    track: "#d1fae5",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    glow: "shadow-emerald-100",
    icon: <CheckCircle2 size={13} />,
    bg: "from-emerald-50/40",
  },
  warning: {
    label: "At Risk",
    ring: "#f59e0b",
    track: "#fef3c7",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    glow: "shadow-amber-100",
    icon: <AlertTriangle size={13} />,
    bg: "from-amber-50/40",
  },
  critical: {
    label: "Critical",
    ring: "#ef4444",
    track: "#fee2e2",
    badge: "bg-red-50 text-red-700 border-red-200",
    glow: "shadow-red-100",
    icon: <AlertTriangle size={13} />,
    bg: "from-red-50/40",
  },
};

const FACTOR_BAR = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad:  "bg-red-400",
};

const FACTOR_DOT = {
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  bad:  "bg-red-500",
};

// ── Score ring SVG ─────────────────────────────────────────────────────────────

function ScoreRing({ score, color, track }: { score: number; color: string; track: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="flex-shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke={track} strokeWidth="8" />
      <circle
        cx="55" cy="55" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="55" y="49" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
        {score}
      </text>
      <text x="55" y="63" textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8" letterSpacing="1">
        / 100
      </text>
    </svg>
  );
}

// ── Velocity trend icon ────────────────────────────────────────────────────────

function VelocityIcon({ trend }: { trend: string }) {
  if (trend === "up")   return <TrendingUp   size={12} className="text-emerald-500" />;
  if (trend === "down") return <TrendingDown  size={12} className="text-red-500"     />;
  if (trend === "stable") return <Minus       size={12} className="text-amber-500"   />;
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProjectHealthWidget({ projectId }: { projectId: string }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate health score");
      setHealth(data);
      setExpanded(true);
      setHasLoaded(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const cfg = health ? STATUS_CFG[health.status] : null;

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // ── Empty / initial state ──────────────────────────────────────────────────
  if (!health) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
              <Activity size={15} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Project Health</h3>
              <p className="text-[11px] text-slate-400">Score 5 signals to get an instant health assessment</p>
            </div>
          </div>
          <button
            onClick={calculate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Analysing…</>
            ) : (
              <><Sparkles size={14} /> Calculate</>
            )}
          </button>
        </div>
        {error && (
          <div className="px-5 pb-4 text-xs text-red-600 bg-red-50 border-t border-red-100 py-2">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Result state ───────────────────────────────────────────────────────────
  return (
    <div className={`bg-gradient-to-r ${cfg!.bg} to-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
            <Activity size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-bold text-slate-900">AI Project Health</span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cfg!.badge}`}>
            {cfg!.icon} {cfg!.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
            {timeAgo(health.computedAt)}
          </span>
          <button
            onClick={calculate}
            disabled={loading}
            title="Recalculate"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Score + summary row — always visible */}
      <div className="flex items-center gap-5 px-5 py-4">
        <ScoreRing
          score={health.score}
          color={cfg!.ring}
          track={cfg!.track}
        />
        <div className="flex-1 min-w-0">
          {/* Velocity + active sprint pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {health.signals.activeSprintCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {health.signals.activeSprintCount} active sprint{health.signals.activeSprintCount !== 1 ? "s" : ""}
              </span>
            )}
            {health.signals.velocityTrend !== "none" && (
              <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <VelocityIcon trend={health.signals.velocityTrend} />
                Velocity {health.signals.velocityTrend}
              </span>
            )}
            {health.signals.overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <AlertTriangle size={9} /> {health.signals.overdueCount} overdue
              </span>
            )}
            {health.signals.timelineDeviation !== 0 && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                health.signals.timelineDeviation > 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}>
                {health.signals.timelineDeviation > 0
                  ? `${health.signals.timelineDeviation}% ahead`
                  : `${Math.abs(health.signals.timelineDeviation)}% behind`}
              </span>
            )}
          </div>

          {/* AI narrative */}
          {health.narrative && (
            <p className="text-sm text-slate-600 leading-relaxed">
              <Sparkles size={11} className="inline text-indigo-400 mr-1 mb-0.5" />
              {health.narrative}
            </p>
          )}
        </div>
      </div>

      {/* Expanded: factor breakdown */}
      {expanded && (
        <div className="px-5 pb-5 space-y-2.5 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Score Breakdown</p>
          {health.factors.map((f) => (
            <div key={f.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${FACTOR_DOT[f.status]}`} />
                  <span className="text-xs font-semibold text-slate-700">{f.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-500">{f.score}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${FACTOR_BAR[f.status]}`}
                  style={{ width: `${f.score}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 ml-3.5">{f.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
