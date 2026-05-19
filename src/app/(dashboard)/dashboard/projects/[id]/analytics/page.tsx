"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, DollarSign, TrendingDown, TrendingUp,
  AlertTriangle, Loader2, Users, Edit2, Check, X,
  Activity, Target, Zap, BarChart2, Shield, Clock,
  ArrowRight, Minus, Flame, Receipt, Plus, Trash2,
  ChevronDown, ChevronUp, History, Server, Wrench,
  Package, Palette, Megaphone, Car, GraduationCap,
  UserCheck, Rocket, ListChecks, Award, Gauge,
} from "lucide-react";
import { updateProjectBudget } from "./actions";
import { createClient } from "../../../../../utils/supabase/client";

// ── Formatting ─────────────────────────────────────────────────────────────────

function fmt(n: number, cur = "$") {
  if (n >= 1_000_000) return `${cur}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${cur}${(n / 1_000).toFixed(1)}K`;
  return `${cur}${Math.round(n).toLocaleString()}`;
}

function fmtFull(n: number, cur = "$") {
  return `${cur}${Math.round(n).toLocaleString()}`;
}

// ── Color helpers ──────────────────────────────────────────────────────────────

const PALETTE = [
  "#6366f1", "#7c3aed", "#059669", "#dc2626",
  "#d97706", "#0284c7", "#db2777", "#0d9488",
  "#ea580c", "#4f46e5",
];

function memberColor(i: number) { return PALETTE[i % PALETTE.length]; }

function healthColor(pct: number) {
  if (pct > 100) return "#dc2626";
  if (pct > 90)  return "#f97316";
  if (pct > 70)  return "#f59e0b";
  return "#10b981";
}

function healthBadge(pct: number): { text: string; cls: string } {
  if (pct > 100) return { text: "Over Budget",  cls: "bg-red-100 text-red-700 border-red-200" };
  if (pct > 90)  return { text: "Critical",     cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (pct > 70)  return { text: "At Risk",      cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return           { text: "On Track",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

// ── Budget Arc Gauge ───────────────────────────────────────────────────────────

function BudgetArc({ pct }: { pct: number }) {
  const r = 72, cx = 95, cy = 95;
  const circ = 2 * Math.PI * r;
  const track = circ * 0.75;
  const filled = Math.min(1.05, pct / 100) * track;
  const col = healthColor(pct);
  return (
    <svg viewBox="0 0 190 175" className="w-full">
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="#ffffff14" strokeWidth={14} strokeLinecap="round"
        strokeDasharray={`${track} ${circ - track}`}
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={col} strokeWidth={14} strokeLinecap="round"
        strokeDasharray={`${Math.min(filled, track)} ${circ - Math.min(filled, track)}`}
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ filter: `drop-shadow(0 0 8px ${col}80)` }}
      />
    </svg>
  );
}

// ── Weekly Burn Bar Chart ──────────────────────────────────────────────────────

function WeeklyBurnChart({ weeks, currentWeek, currency }: {
  weeks: { week: number; cost: number }[];
  currentWeek: number;
  currency: string;
}) {
  if (!weeks.length) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
      No weekly data yet
    </div>
  );
  const W = 460, H = 180, pL = 8, pR = 24, pT = 22, pB = 28;
  const chartW = W - pL - pR;
  const chartH = H - pT - pB;
  const maxCost = Math.max(...weeks.map(w => w.cost), 1);
  const avgCost = weeks.reduce((s, w) => s + w.cost, 0) / weeks.length;
  const step = chartW / weeks.length;
  const barW = Math.max(3, step - 5);
  const avgY = pT + chartH - (avgCost / maxCost) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {/* Avg reference line */}
      <line x1={pL} y1={avgY} x2={W - pR} y2={avgY}
        stroke="#a5b4fc" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      <text x={W - pR + 3} y={avgY + 4} fill="#a5b4fc" fontSize={8} fontWeight="700">AVG</text>

      {weeks.map((w, i) => {
        const barH = Math.max(2, (w.cost / maxCost) * chartH);
        const x = pL + i * step + (step - barW) / 2;
        const y = pT + chartH - barH;
        const isPast = w.week < currentWeek;
        const isCurr = w.week === currentWeek;
        const isPeak = w.cost === maxCost && w.cost > 0;
        const fill = isPeak ? "#6366f1" : isCurr ? "#818cf8" : isPast ? "#a5b4fc" : "#e0e7ff";

        return (
          <g key={w.week}>
            <title>{currency}{w.cost.toLocaleString()} — Week {w.week}</title>
            <rect x={x} y={y} width={barW} height={barH} rx={2.5} fill={fill} />
            {isPeak && (
              <text x={x + barW / 2} y={y - 5} fill="#6366f1" fontSize={8}
                textAnchor="middle" fontWeight="800">
                {fmt(w.cost, currency)}
              </text>
            )}
            {(weeks.length <= 14 || isCurr || i === 0 || i === weeks.length - 1) && (
              <text x={x + barW / 2} y={H - pB + 12} fill={isCurr ? "#6366f1" : "#94a3b8"}
                fontSize={8} textAnchor="middle" fontWeight={isCurr ? "800" : "400"}>
                W{w.week}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Cumulative Burn Area Chart ─────────────────────────────────────────────────

function CumulativeBurnArea({ weeks, budget, totalWeeks, currentWeek, currency }: {
  weeks: { week: number; cost: number }[];
  budget: number;
  totalWeeks: number;
  currentWeek: number;
  currency: string;
}) {
  let running = 0;
  const pts: { week: number; cum: number; past: boolean }[] = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const found = weeks.find(d => d.week === w);
    if (found) running += found.cost;
    pts.push({ week: w, cum: running, past: w <= currentWeek });
  }

  const maxY = Math.max(budget * 1.15, running * 1.15, 1);
  const W = 460, H = 180, pL = 46, pR = 24, pT = 18, pB = 28;
  const chartW = W - pL - pR;
  const chartH = H - pT - pB;

  const xp = (w: number) => pL + ((w - 1) / Math.max(totalWeeks - 1, 1)) * chartW;
  const yp = (v: number) => pT + chartH - (v / maxY) * chartH;

  const splitIdx = pts.findIndex(p => !p.past);
  const actualPts = splitIdx >= 0 ? pts.slice(0, splitIdx + 1) : pts;
  const projPts   = splitIdx >= 0 ? pts.slice(splitIdx) : [];

  const pathStr = (arr: typeof pts) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"} ${xp(p.week).toFixed(1)} ${yp(p.cum).toFixed(1)}`).join(" ");

  const areaStr = actualPts.length > 1
    ? `${pathStr(actualPts)} L ${xp(actualPts[actualPts.length - 1].week).toFixed(1)} ${(pT + chartH).toFixed(1)} L ${xp(actualPts[0].week).toFixed(1)} ${(pT + chartH).toFixed(1)} Z`
    : "";

  const budgetY = yp(budget);
  const yTicks = [0, Math.round(budget / 2), budget].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="burnAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid + Y labels */}
      {yTicks.map(v => {
        const y = yp(v);
        return (
          <g key={v}>
            <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            <text x={pL - 4} y={y + 3.5} fill="#94a3b8" fontSize={8} textAnchor="end">
              {fmt(v, currency)}
            </text>
          </g>
        );
      })}

      {/* Budget ceiling */}
      {budget > 0 && (
        <>
          <line x1={pL} y1={budgetY} x2={W - pR} y2={budgetY}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={W - pR + 3} y={budgetY + 3.5} fill="#f59e0b" fontSize={8} fontWeight="700">
            BUDGET
          </text>
        </>
      )}

      {/* Actual area fill */}
      {areaStr && <path d={areaStr} fill="url(#burnAreaGrad)" />}

      {/* Actual line */}
      {actualPts.length > 1 && (
        <polyline
          points={actualPts.map(p => `${xp(p.week).toFixed(1)},${yp(p.cum).toFixed(1)}`).join(" ")}
          fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round"
        />
      )}

      {/* Projected line (dashed) */}
      {projPts.length > 1 && (
        <polyline
          points={projPts.map(p => `${xp(p.week).toFixed(1)},${yp(p.cum).toFixed(1)}`).join(" ")}
          fill="none" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="6 4"
        />
      )}

      {/* X axis labels */}
      {[1, Math.ceil(totalWeeks / 2), totalWeeks].map(w => (
        <text key={w} x={xp(w).toFixed(1)} y={H - pB + 13}
          fill="#94a3b8" fontSize={8} textAnchor="middle">
          W{w}
        </text>
      ))}
    </svg>
  );
}

// ── Velocity Bar Chart ─────────────────────────────────────────────────────────

function VelocityChart({ sprints, avgVelocity }: {
  sprints: { sprintName: string; estimatedHours: number; completedEstHours: number; status: string }[];
  avgVelocity: number;
}) {
  if (!sprints.length) return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
      No sprint data yet
    </div>
  );

  const W = 480, H = 180, pL = 8, pR = 20, pT = 22, pB = 36;
  const chartW = W - pL - pR;
  const chartH = H - pT - pB;
  const maxVal = Math.max(...sprints.map(s => s.estimatedHours), avgVelocity, 1);
  const step = chartW / sprints.length;
  const grpW = Math.max(6, step - 6);
  const barW = Math.max(2, Math.floor(grpW / 2) - 1);
  const avgY = pT + chartH - (avgVelocity / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {/* Avg velocity reference line */}
      {avgVelocity > 0 && (
        <>
          <line x1={pL} y1={avgY} x2={W - pR} y2={avgY}
            stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.8} />
          <text x={W - pR + 3} y={avgY + 4} fill="#10b981" fontSize={7.5} fontWeight="700">AVG</text>
        </>
      )}

      {sprints.map((sp, i) => {
        const x = pL + i * step + (step - grpW) / 2;
        const estH = Math.max(2, (sp.estimatedHours / maxVal) * chartH);
        const doneH = Math.max(sp.completedEstHours > 0 ? 2 : 0, (sp.completedEstHours / maxVal) * chartH);
        const estY = pT + chartH - estH;
        const doneY = pT + chartH - doneH;
        const isCompleted = sp.status === "completed";
        const isActive = sp.status === "active";
        const doneFill = isCompleted ? "#6366f1" : isActive ? "#818cf8" : "#c7d2fe";
        const label = sp.sprintName.replace(/sprint\s*/i, "S").substring(0, 6);

        return (
          <g key={i}>
            <title>{sp.sprintName}: {sp.completedEstHours}h done / {sp.estimatedHours}h estimated</title>
            {/* Estimated (background) */}
            <rect x={x} y={estY} width={grpW} height={estH} rx={2} fill="#e2e8f0" />
            {/* Completed (foreground) */}
            {sp.completedEstHours > 0 && (
              <rect x={x + barW / 2 - 0.5} y={doneY} width={barW + 1} height={doneH} rx={2} fill={doneFill} />
            )}
            <text x={x + grpW / 2} y={H - pB + 13} fill="#94a3b8"
              fontSize={7} textAnchor="middle" fontWeight={isActive ? "700" : "400"}>
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${pL}, ${pT - 14})`}>
        <rect x={0} y={0} width={8} height={8} rx={1} fill="#e2e8f0" />
        <text x={11} y={7} fill="#94a3b8" fontSize={7.5}>Estimated</text>
        <rect x={60} y={0} width={8} height={8} rx={1} fill="#6366f1" />
        <text x={71} y={7} fill="#94a3b8" fontSize={7.5}>Completed</text>
        <rect x={128} y={0} width={8} height={8} rx={1} fill="#818cf8" />
        <text x={139} y={7} fill="#94a3b8" fontSize={7.5}>Active</text>
      </g>
    </svg>
  );
}

// ── Completion Rate Mini-Bar ───────────────────────────────────────────────────

function CompletionBar({ pct, color = "#6366f1" }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "hosting",    label: "Hosting / Cloud",  icon: <Server size={13} />,       color: "text-sky-600 bg-sky-50 border-sky-200" },
  { id: "license",    label: "Licenses / SaaS",  icon: <Package size={13} />,      color: "text-violet-600 bg-violet-50 border-violet-200" },
  { id: "tools",      label: "Tools / Software", icon: <Wrench size={13} />,       color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { id: "design",     label: "Design / Themes",  icon: <Palette size={13} />,      color: "text-pink-600 bg-pink-50 border-pink-200" },
  { id: "hardware",   label: "Hardware",          icon: <Package size={13} />,      color: "text-slate-600 bg-slate-50 border-slate-200" },
  { id: "marketing",  label: "Marketing",         icon: <Megaphone size={13} />,    color: "text-orange-600 bg-orange-50 border-orange-200" },
  { id: "travel",     label: "Travel",            icon: <Car size={13} />,          color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "training",   label: "Training",          icon: <GraduationCap size={13} />,color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "contractor", label: "Contractor",        icon: <UserCheck size={13} />,    color: "text-teal-600 bg-teal-50 border-teal-200" },
  { id: "other",      label: "Other",             icon: <Receipt size={13} />,      color: "text-slate-500 bg-slate-50 border-slate-200" },
];

function getCatMeta(catId: string) {
  return EXPENSE_CATEGORIES.find(c => c.id === catId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export default function AnalyticsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState("");
  const [budgetNote, setBudgetNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Expenses
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expForm, setExpForm] = useState({ category: "other", description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  // Budget history
  const [showBudgetHistory, setShowBudgetHistory] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // Velocity
  const [velocityData, setVelocityData] = useState<any>(null);

  const refetch = async () => {
    const [costRes, velRes] = await Promise.all([
      fetch(`/api/analytics/cost?project_id=${id}`, { cache: "no-store" }),
      fetch(`/api/analytics/velocity?project_id=${id}`, { cache: "no-store" }),
    ]);
    if (costRes.ok) setData(await costRes.json());
    if (velRes.ok) setVelocityData(await velRes.json());
  };

  useEffect(() => {
    (async () => {
      try {
        const [costRes, velRes] = await Promise.all([
          fetch(`/api/analytics/cost?project_id=${id}`, { cache: "no-store" }),
          fetch(`/api/analytics/velocity?project_id=${id}`, { cache: "no-store" }),
        ]);
        if (!costRes.ok) throw new Error("Failed to load analytics");
        const json = await costRes.json();
        setData(json);
        setNewBudgetVal(json.budgetEstimate?.toString() || "0");
        if (velRes.ok) setVelocityData(await velRes.json());

        // Role check
        const workspaceId = json.workspaceId;
        if (workspaceId) {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const [wsResult, memberResult] = await Promise.all([
              supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
              supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle(),
            ]);
            setIsAdmin(wsResult.data?.owner_id === user.id || memberResult.data?.role === "pm");
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSaveBudget = async () => {
    setIsUpdating(true);
    const num = parseInt(newBudgetVal.replace(/,/g, ""), 10) || 0;
    const res = await updateProjectBudget(id as string, num, budgetNote || undefined);
    if (res.success) {
      setData((prev: any) => ({ ...prev, budgetEstimate: num }));
      setIsEditingBudget(false);
      setBudgetNote("");
      await refetch();
    }
    setIsUpdating(false);
  };

  const handleAddExpense = async () => {
    if (!expForm.description.trim() || !expForm.amount) { setExpError("Description and amount are required"); return; }
    const amt = parseFloat(expForm.amount);
    if (isNaN(amt) || amt <= 0) { setExpError("Amount must be a positive number"); return; }
    setExpLoading(true);
    setExpError(null);
    const workspaceId = data?.workspaceId;
    const res = await fetch("/api/analytics/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, workspaceId, ...expForm, amount: amt }),
    });
    const json = await res.json();
    if (!res.ok) { setExpError(json.error); setExpLoading(false); return; }
    setShowAddExpense(false);
    setExpForm({ category: "other", description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10) });
    setExpLoading(false);
    await refetch();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await fetch(`/api/analytics/expenses?id=${expenseId}`, { method: "DELETE" });
    await refetch();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-indigo-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-sm font-medium animate-pulse">Calculating Project Financials…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100 max-w-lg mx-auto mt-12">
        <AlertTriangle className="mx-auto mb-4" size={32} />
        <p className="font-bold">Error loading financials</p>
        <p className="text-sm text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const budget         = data.budgetEstimate      || 0;
  const forecasted     = data.totalCalculatedCost || 0;
  const spent          = data.actualSpentCost      || 0;
  const cur            = data.currency === "USD" ? "$" : (data.currency || "$");
  const weeks: { week: number; cost: number }[]               = data.weeklyBurnChart   || [];
  const resources: { name: string; cost: number; hours: number }[] = data.resourceCostChart || [];
  const totalWeeks     = data.timelineWeeks        || Math.max(...weeks.map(w => w.week), 12);
  const currentWeek    = data.currentWeek          || 1;
  const completedMs    = data.completedMilestones  || 0;
  const totalMs        = data.totalMilestones       || 0;
  const actualHrs      = data.actualHoursWorked     || 0;
  const estHrs         = data.totalEstimatedHours   || 0;
  const expenses: any[]         = data.expenses          || [];
  const totalExpenses  = data.totalExpenses        || 0;
  const milestoneVariance: any[] = data.milestoneVariance || [];
  const budgetLog: any[]        = data.budgetLog          || [];

  const remaining      = budget - spent;
  const overrun        = forecasted - budget;
  const isOver         = forecasted > budget && budget > 0;
  const utilPct        = budget > 0 ? Math.round((forecasted / budget) * 100) : 0;
  const burnPct        = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const overhead       = Math.round(budget * 0.15);
  const riskBuf        = Math.round(budget * 0.10);
  const effectiveBudget= Math.max(0, budget - overhead - riskBuf);
  const avgWeeklyBurn  = weeks.length > 0 ? Math.round(forecasted / weeks.length) : 0;
  const maxWeekCost    = weeks.length > 0 ? Math.max(...weeks.map(w => w.cost)) : 0;
  const peakWeek       = weeks.find(w => w.cost === maxWeekCost && w.cost > 0);
  const costPerMs      = totalMs > 0 ? Math.round(forecasted / totalMs) : 0;
  const totalResHrs    = resources.reduce((s, r) => s + r.hours, 0);
  const hrsProgress    = estHrs > 0 ? Math.round((actualHrs / estHrs) * 100) : null;

  const hbadge         = healthBadge(utilPct);
  const hcolor         = healthColor(utilPct);

  // Personnel cost % of budget
  const personnelPct   = budget > 0 ? Math.round((forecasted / budget) * 100) : 0;
  const unallocated    = Math.max(0, budget - forecasted - overhead - riskBuf);

  // ── Velocity derived ───────────────────────────────────────────────────────
  const sprintVelocity: any[]  = velocityData?.sprintVelocity   || [];
  const memberVelocity: any[]  = velocityData?.memberVelocity   || [];
  const avgVelocity            = velocityData?.avgVelocity       ?? 0;
  const totalRemainingHours    = velocityData?.totalRemainingHours ?? 0;
  const predictedSprints       = velocityData?.predictedSprintsToComplete ?? null;
  const velocityTrend          = velocityData?.velocityTrend     || "insufficient_data";
  const completedSprintCount   = velocityData?.completedSprintCount ?? 0;
  const hasVelocityData        = sprintVelocity.length > 0;

  const trendCfg = {
    improving:        { label: "Improving",         cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <TrendingUp size={11} /> },
    declining:        { label: "Declining",          cls: "bg-red-100 text-red-700 border-red-200",            icon: <TrendingDown size={11} /> },
    stable:           { label: "Stable",             cls: "bg-slate-100 text-slate-600 border-slate-200",      icon: <Minus size={11} /> },
    insufficient_data:{ label: "Not enough data",    cls: "bg-slate-100 text-slate-400 border-slate-200",      icon: <Clock size={11} /> },
  }[velocityTrend] ?? { label: velocityTrend, cls: "bg-slate-100 text-slate-500 border-slate-200", icon: null };

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6">

      {/* Back */}
      <Link
        href={`/dashboard/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Project
      </Link>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative p-8 flex flex-col md:flex-row md:items-center gap-8">
          {/* Left */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center">
                <DollarSign size={18} className="text-white" />
              </div>
              <span className="text-white/50 text-[10px] font-bold tracking-[4px] uppercase">Financial Command Center</span>
            </div>

            <h1 className="text-3xl font-black text-white mb-1.5 tracking-tight">Project Financials</h1>
            <p className="text-white/40 text-sm mb-5">Burn rate · Resource costs · Budget forecast · Risk analysis</p>

            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${hbadge.cls}`}>
                {hbadge.text}
              </span>
              <span className="text-white/20">·</span>
              {totalMs > 0 && (
                <span className="text-white/40 text-xs">{completedMs}/{totalMs} milestones complete</span>
              )}
              {peakWeek && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-xs">Peak spend Week {peakWeek.week}</span>
                </>
              )}
              {hrsProgress !== null && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-white/40 text-xs">{actualHrs}/{estHrs}h tracked ({hrsProgress}%)</span>
                </>
              )}
            </div>

            {/* Mini stat strip */}
            <div className="flex gap-4 mt-6 flex-wrap">
              {[
                { label: "Budget",     value: fmt(budget, cur),     dim: !budget },
                { label: "Forecasted", value: fmt(forecasted, cur), dim: false },
                { label: "Spent",      value: fmt(spent, cur),      dim: false },
                { label: "Week",       value: `${currentWeek}/${totalWeeks}`, dim: false },
              ].map(s => (
                <div key={s.label}>
                  <div className={`text-base font-black ${s.dim ? "text-white/30" : "text-white"}`}>{s.value}</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: arc gauge */}
          <div className="flex flex-col items-center w-44 flex-shrink-0">
            <div className="relative w-full">
              <BudgetArc pct={utilPct} />
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: 14 }}>
                <span className="text-3xl font-black text-white">{utilPct}%</span>
                <span className="text-[9px] text-white/35 uppercase tracking-widest font-bold mt-0.5">Budget Used</span>
              </div>
            </div>
            <div className="flex gap-4 mt-1 text-center">
              <div>
                <div className="text-xs font-black" style={{ color: hcolor }}>{fmt(spent, cur)}</div>
                <div className="text-[8px] text-white/30 uppercase tracking-wide">Spent</div>
              </div>
              <div className="text-white/15">|</div>
              <div>
                <div className="text-xs font-black text-white/50">{fmt(budget, cur)}</div>
                <div className="text-[8px] text-white/30 uppercase tracking-wide">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards (2×3) ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        {/* 1 — Total Budget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Target size={13} className="text-indigo-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Budget</span>
            </div>
            {isAdmin && !isEditingBudget && (
              <button onClick={() => setIsEditingBudget(true)}
                className="text-slate-300 hover:text-indigo-600 transition-colors p-1 rounded">
                <Edit2 size={12} />
              </button>
            )}
          </div>

          {isAdmin && isEditingBudget ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-sm font-bold">{cur}</span>
                <input
                  type="number" autoFocus
                  value={newBudgetVal}
                  onChange={(e) => setNewBudgetVal(e.target.value)}
                  className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isUpdating}
                />
                <button onClick={handleSaveBudget} disabled={isUpdating}
                  className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex-shrink-0">
                  {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button onClick={() => { setIsEditingBudget(false); setBudgetNote(""); }} disabled={isUpdating}
                  className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Reason for change (optional)"
                value={budgetNote}
                onChange={(e) => setBudgetNote(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                disabled={isUpdating}
              />
            </div>
          ) : (
            <div className="text-2xl font-black text-slate-900">{fmtFull(budget, cur)}</div>
          )}

          <div className="mt-2 text-[10px] text-slate-400">
            {budget > 0 ? `Effective ${fmt(effectiveBudget, cur)} after reserves` : "No budget set — click edit to add one"}
          </div>
        </div>

        {/* 2 — Forecasted Cost */}
        <div className={`rounded-2xl p-5 shadow-sm border ${isOver ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isOver ? "bg-red-100" : "bg-emerald-100"}`}>
              {isOver
                ? <TrendingUp size={13} className="text-red-600" />
                : <TrendingDown size={13} className="text-emerald-600" />
              }
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forecasted</span>
          </div>
          <div className={`text-2xl font-black ${isOver ? "text-red-700" : "text-slate-900"}`}>
            {fmtFull(forecasted, cur)}
          </div>
          <div className={`mt-2 text-[10px] font-bold ${isOver ? "text-red-500" : "text-emerald-600"}`}>
            {budget === 0
              ? "Set a budget to see variance"
              : isOver
              ? `${fmtFull(overrun, cur)} overrun projected`
              : `${fmtFull(budget - forecasted, cur)} under budget`
            }
          </div>
        </div>

        {/* 3 — Actual Spent */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 border border-indigo-500 rounded-2xl p-5 shadow-lg shadow-indigo-100 text-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center">
              <Activity size={13} className="text-white" />
            </div>
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Actual Spent</span>
          </div>
          <div className="text-2xl font-black">{fmtFull(spent, cur)}</div>
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${burnPct}%` }} />
          </div>
          <div className="mt-1.5 text-[10px] text-indigo-200">{burnPct}% of budget consumed</div>
        </div>

        {/* 4 — Remaining Budget */}
        <div className={`rounded-2xl p-5 shadow-sm border ${remaining < 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${remaining < 0 ? "bg-red-100" : "bg-slate-100"}`}>
              <Shield size={13} className={remaining < 0 ? "text-red-600" : "text-slate-500"} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining</span>
          </div>
          <div className={`text-2xl font-black ${remaining < 0 ? "text-red-700" : "text-slate-900"}`}>
            {fmtFull(Math.abs(remaining), cur)}
          </div>
          <div className={`mt-2 text-[10px] ${remaining < 0 ? "text-red-400 font-bold" : "text-slate-400"}`}>
            {remaining < 0 ? "Already overspent" : "Budget still available"}
          </div>
        </div>

        {/* 5 — Overhead & Risk Reserve */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <Flame size={13} className="text-amber-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reserves</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{fmtFull(overhead + riskBuf, cur)}</div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
              15% overhead
            </span>
            <span className="text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">
              10% risk buffer
            </span>
          </div>
        </div>

        {/* 6 — Avg Weekly Burn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
              <BarChart2 size={13} className="text-sky-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Burn</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{fmtFull(avgWeeklyBurn, cur)}</div>
          <div className="mt-2 text-[10px] text-slate-400 space-x-2">
            {costPerMs > 0 && <span>{fmt(costPerMs, cur)}/milestone</span>}
            {totalResHrs > 0 && <span>· {totalResHrs}h total</span>}
          </div>
        </div>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Weekly Burn Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900">Weekly Burn Rate</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Forecasted cost per sprint week</p>
            </div>
            {peakWeek && (
              <div className="text-right flex-shrink-0">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Peak week</div>
                <div className="text-xs font-black text-indigo-700">W{peakWeek.week} · {fmt(maxWeekCost, cur)}</div>
              </div>
            )}
          </div>
          <WeeklyBurnChart weeks={weeks} currentWeek={currentWeek} currency={cur} />
          {avgWeeklyBurn > 0 && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
              <div className="w-5 border-t border-dashed border-indigo-300 flex-shrink-0" />
              <span>Average {fmt(avgWeeklyBurn, cur)}/week over {weeks.length} active weeks</span>
            </div>
          )}
        </div>

        {/* Cumulative Burn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900">Cumulative Spend</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Running total vs budget ceiling</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-indigo-500 rounded" />
                <span className="text-[9px] text-slate-400">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 border-t border-dashed border-indigo-300" />
                <span className="text-[9px] text-slate-400">Projected</span>
              </div>
            </div>
          </div>
          <CumulativeBurnArea
            weeks={weeks}
            budget={budget}
            totalWeeks={totalWeeks}
            currentWeek={currentWeek}
            currency={cur}
          />
        </div>
      </div>

      {/* ── Resource Cost Breakdown ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-slate-900">Resource Cost Breakdown</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {resources.length} member{resources.length !== 1 ? "s" : ""} · {totalResHrs} total hours allocated
            </p>
          </div>
          {resources.length > 0 && (
            <div className="text-right">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider">Total Cost</div>
              <div className="text-sm font-black text-slate-900">{fmtFull(forecasted, cur)}</div>
            </div>
          )}
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm italic">
            No resources assigned yet — run allocation to see cost breakdown.
          </div>
        ) : (
          <div className="space-y-4">
            {resources.map((r, i) => {
              const pct = forecasted > 0 ? (r.cost / forecasted) * 100 : 0;
              const col = memberColor(i);
              const rate = r.hours > 0 ? Math.round(r.cost / r.hours) : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                        style={{ backgroundColor: col }}
                      >
                        {r.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-800">{r.name}</span>
                        {rate > 0 && (
                          <span className="ml-2 text-[10px] text-slate-400">{cur}{rate}/hr</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{fmtFull(r.cost, cur)}</div>
                      <div className="text-[9px] text-slate-400">{r.hours}h · {Math.round(pct)}% of total</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: col }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{Math.round(pct)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Budget Composition ────────────────────────────────────────────── */}
      {budget > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-black text-slate-900 mb-1">Budget Composition</h3>
          <p className="text-[11px] text-slate-400 mb-5">How the total budget is distributed across cost categories</p>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* Stacked bar */}
            <div>
              <div className="flex rounded-xl overflow-hidden h-9 shadow-sm mb-3">
                {[
                  { label: "Personnel",   value: forecasted,  color: "#6366f1" },
                  { label: "Overhead",    value: overhead,    color: "#f59e0b" },
                  { label: "Risk Buffer", value: riskBuf,     color: "#f97316" },
                  { label: "Unallocated", value: unallocated, color: "#e2e8f0" },
                ].map((seg, i) => {
                  const w = (seg.value / budget) * 100;
                  return w > 0.5 ? (
                    <div
                      key={i}
                      className="h-full transition-all"
                      style={{ width: `${w}%`, backgroundColor: seg.color }}
                      title={`${seg.label}: ${fmtFull(seg.value, cur)}`}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {[
                  { label: "Personnel",        value: forecasted,  color: "#6366f1" },
                  { label: "Overhead (15%)",   value: overhead,    color: "#f59e0b" },
                  { label: "Risk Buffer (10%)",value: riskBuf,     color: "#f97316" },
                  { label: "Unallocated",      value: unallocated, color: "#e2e8f0" },
                ].map((seg, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white shadow-sm"
                      style={{ backgroundColor: seg.color }} />
                    <span className="text-[10px] text-slate-500">{seg.label}</span>
                    <span className="text-[10px] font-bold text-slate-700">{fmt(seg.value, cur)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key ratio table */}
            <div className="space-y-3">
              {[
                {
                  label: "Personnel / Budget",
                  value: `${personnelPct}%`,
                  ideal: "< 75%",
                  ok: personnelPct <= 75,
                },
                {
                  label: "Overhead Coverage",
                  value: "15%",
                  ideal: "10–20%",
                  ok: true,
                },
                {
                  label: "Risk Contingency",
                  value: "10%",
                  ideal: "≥ 10%",
                  ok: true,
                },
                {
                  label: "Milestone Progress",
                  value: totalMs > 0 ? `${Math.round((completedMs / totalMs) * 100)}%` : "—",
                  ideal: "On schedule",
                  ok: true,
                },
                ...(hrsProgress !== null ? [{
                  label: "Hours Tracked",
                  value: `${hrsProgress}%`,
                  ideal: "Matches plan",
                  ok: hrsProgress >= 80,
                }] : []),
              ].map(kv => (
                <div key={kv.label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500 flex-1">{kv.label}</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">ideal: {kv.ideal}</span>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${kv.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {kv.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Financial Insights (dark cards) ────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: <Activity size={13} className="text-indigo-400" />,
            iconBg: "bg-indigo-500/20 border-indigo-400/30",
            label: "Burn Analysis",
            labelColor: "text-indigo-300",
            body: avgWeeklyBurn > 0
              ? `At ${fmt(avgWeeklyBurn, cur)}/week, the project ${isOver ? `projects a ${fmtFull(overrun, cur)} overrun and may need scope reduction.` : `has ${fmt(budget - forecasted, cur)} remaining headroom — currently tracking well within budget.`}`
              : "No burn data available yet. Assign team members to milestones to generate weekly forecasts.",
          },
          {
            icon: <Users size={13} className="text-amber-400" />,
            iconBg: "bg-amber-500/20 border-amber-400/30",
            label: "Top Cost Driver",
            labelColor: "text-amber-300",
            body: resources.length > 0
              ? `${resources[0].name} is the largest cost centre at ${fmtFull(resources[0].cost, cur)} — ${Math.round((resources[0].cost / Math.max(forecasted, 1)) * 100)}% of total resource costs across ${resources[0].hours} hours.`
              : "No resources assigned yet. Run AI allocation to populate cost data.",
          },
          {
            icon: <Zap size={13} className="text-emerald-400" />,
            iconBg: "bg-emerald-500/20 border-emerald-400/30",
            label: "Recommendation",
            labelColor: "text-emerald-300",
            body: isOver
              ? `Projected overrun of ${fmtFull(overrun, cur)}. Consider reducing milestone scope, renegotiating hourly rates, or extending the timeline to spread cost.`
              : budget === 0
              ? "Set a budget estimate to unlock full financial forecasting and risk analysis across all milestones."
              : `Budget health is ${hbadge.text.toLowerCase()}. The ${fmtFull(overhead + riskBuf, cur)} reserve covers 25% of total budget — a healthy contingency margin.`,
          },
        ].map((ins, i) => (
          <div key={i} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 border rounded-lg flex items-center justify-center flex-shrink-0 ${ins.iconBg}`}>
                {ins.icon}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${ins.labelColor}`}>
                {ins.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{ins.body}</p>
          </div>
        ))}
      </div>

      {/* ── Week-by-Week Cost Table ────────────────────────────────────────── */}
      {weeks.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900">Week-by-Week Schedule</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Cost breakdown per active project week</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1 rounded-full">
              {weeks.length} active week{weeks.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-3 font-bold">Week</th>
                  <th className="text-left px-6 py-3 font-bold">Cost</th>
                  <th className="text-left px-6 py-3 font-bold">% of Total</th>
                  <th className="text-left px-6 py-3 font-bold">Relative</th>
                  <th className="text-left px-6 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weeks.map((w) => {
                  const pct = forecasted > 0 ? (w.cost / forecasted) * 100 : 0;
                  const relPct = maxWeekCost > 0 ? (w.cost / maxWeekCost) * 100 : 0;
                  const isPast = w.week < currentWeek;
                  const isCurr = w.week === currentWeek;
                  const isPeak = w.cost === maxWeekCost && w.cost > 0;
                  return (
                    <tr key={w.week} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">W{w.week}</span>
                          {isCurr && (
                            <span className="flex items-center gap-1 text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse inline-block" />
                              NOW
                            </span>
                          )}
                          {isPeak && (
                            <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              PEAK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-black text-slate-900">{fmtFull(w.cost, cur)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-500 font-bold">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isPeak ? "bg-indigo-500" : isPast ? "bg-emerald-400" : "bg-slate-300"}`}
                            style={{ width: `${relPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isPast
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isCurr
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {isPast ? "Completed" : isCurr ? "In Progress" : "Scheduled"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-6 py-3 font-black text-slate-700 text-xs uppercase tracking-wider">Total</td>
                  <td className="px-6 py-3 font-black text-slate-900">{fmtFull(forecasted, cur)}</td>
                  <td className="px-6 py-3 font-black text-slate-500 text-xs">100%</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Milestone Cost Variance ───────────────────────────────────────── */}
      {milestoneVariance.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900">Milestone Cost Variance</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Estimated vs actual hours and cost per milestone</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-bold">Milestone</th>
                  <th className="text-right px-4 py-3 font-bold">Est Hrs</th>
                  <th className="text-right px-4 py-3 font-bold">Actual Hrs</th>
                  <th className="text-right px-4 py-3 font-bold">Est Cost</th>
                  <th className="text-right px-4 py-3 font-bold">Actual Cost</th>
                  <th className="text-right px-4 py-3 font-bold">Variance</th>
                  <th className="text-left px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {milestoneVariance.map((ms: any, i: number) => {
                  const hasActual = ms.actualCost !== null;
                  const varSign = ms.variance !== null ? (ms.variance > 0 ? "+" : ms.variance < 0 ? "" : "±") : null;
                  const varColor = ms.variance === null ? "text-slate-400" : ms.variance > 0 ? "text-red-600" : ms.variance < 0 ? "text-emerald-600" : "text-slate-500";
                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-800 text-xs">{ms.title}</span>
                        <span className="ml-2 text-[10px] text-slate-400">W{ms.week}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">{ms.estHours}h</td>
                      <td className="px-4 py-3 text-right text-xs font-mono">
                        {ms.actualHours !== null
                          ? <span className="font-semibold text-slate-800">{ms.actualHours}h</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">{fmtFull(ms.estCost, cur)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold">
                        {hasActual
                          ? <span className="text-slate-800">{fmtFull(ms.actualCost, cur)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-black">
                        <span className={varColor}>
                          {ms.variance !== null ? `${varSign}${fmtFull(Math.abs(ms.variance), cur)}` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ms.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ms.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {ms.status === "in_progress" ? "In Progress" : ms.status === "completed" ? "Completed" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Project Expenses ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900">Project Expenses</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Non-labour costs · hosting, licences, tools, and more
              {totalExpenses > 0 && <span className="ml-1.5 font-bold text-slate-600">· Total: {fmtFull(totalExpenses, cur)}</span>}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus size={13} /> Add Expense
            </button>
          )}
        </div>

        {/* Add expense form */}
        {showAddExpense && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              {/* Category picker */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setExpForm(f => ({ ...f, category: c.id }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${expForm.category === c.id ? c.color + " ring-1 ring-current" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                  <input
                    type="text"
                    value={expForm.description}
                    onChange={(e) => setExpForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Vercel Pro plan, Figma licence…"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Amount ({cur})</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={expForm.amount}
                      onChange={(e) => setExpForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Date</label>
                    <input
                      type="date"
                      value={expForm.expense_date}
                      onChange={(e) => setExpForm(f => ({ ...f, expense_date: e.target.value }))}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            </div>
            {expError && <p className="text-xs text-red-600 mb-2">{expError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddExpense}
                disabled={expLoading}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {expLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save Expense
              </button>
              <button
                onClick={() => { setShowAddExpense(false); setExpError(null); }}
                className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm italic">
            No expenses logged yet — track hosting, licences, and other project costs here.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {expenses.map((exp: any) => {
              const meta = getCatMeta(exp.category);
              return (
                <div key={exp.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50/60 transition-colors group">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold flex-shrink-0 ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{exp.description}</span>
                  <span className="text-[11px] text-slate-400 flex-shrink-0">{exp.expense_date}</span>
                  <span className="text-sm font-black text-slate-900 flex-shrink-0">{fmtFull(exp.amount, cur)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Delete expense"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
            {totalExpenses > 0 && (
              <div className="flex items-center justify-end gap-3 px-6 py-3 bg-slate-50 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Non-Labour</span>
                <span className="text-base font-black text-slate-900">{fmtFull(totalExpenses, cur)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Budget Change History ──────────────────────────────────────────── */}
      {budgetLog.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowBudgetHistory(!showBudgetHistory)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <History size={13} className="text-amber-600" />
              </div>
              <div className="text-left">
                <h3 className="font-black text-slate-900">Budget Change History</h3>
                <p className="text-[11px] text-slate-400">{budgetLog.length} change{budgetLog.length !== 1 ? "s" : ""} recorded</p>
              </div>
            </div>
            {showBudgetHistory ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {showBudgetHistory && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {budgetLog.map((log: any, i: number) => {
                const date = new Date(log.created_at);
                const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
                const delta = log.new_value - (log.old_value || 0);
                const deltaColor = delta > 0 ? "text-red-600" : delta < 0 ? "text-emerald-600" : "text-slate-400";
                return (
                  <div key={i} className="px-6 py-3 flex items-start gap-4">
                    <div className="text-[10px] text-slate-400 text-right flex-shrink-0 w-24 mt-0.5">
                      <div className="font-semibold">{dateStr}</div>
                      <div>{timeStr}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">{log.changed_by_name || "Unknown"}</span>
                        <span className="text-[10px] text-slate-400">changed budget</span>
                        {log.old_value != null && (
                          <span className="text-[10px] text-slate-500">
                            {fmtFull(log.old_value, cur)} → {fmtFull(log.new_value, cur)}
                          </span>
                        )}
                        <span className={`text-[10px] font-black ${deltaColor}`}>
                          {delta > 0 ? `+${fmtFull(delta, cur)}` : delta < 0 ? fmtFull(delta, cur) : "no change"}
                        </span>
                      </div>
                      {log.note && <p className="text-[11px] text-slate-500 mt-0.5 italic">"{log.note}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sprint Velocity & Historical Metrics ──────────────────────────── */}
      {hasVelocityData && (
        <div className="space-y-4">

          {/* Section header */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Rocket size={15} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Sprint Velocity &amp; Historical Metrics</h2>
              <p className="text-[11px] text-slate-400">How fast is the team delivering across sprints?</p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Avg Velocity",
                value: avgVelocity > 0 ? `${avgVelocity}h` : "—",
                sub: "completed est-hours / sprint",
                color: "text-indigo-600",
                icon: <Gauge size={16} className="text-indigo-500" />,
              },
              {
                label: "Sprints Done",
                value: completedSprintCount,
                sub: `of ${sprintVelocity.length} total`,
                color: "text-emerald-600",
                icon: <ListChecks size={16} className="text-emerald-500" />,
              },
              {
                label: "Remaining Work",
                value: totalRemainingHours > 0 ? `${totalRemainingHours}h` : "—",
                sub: "in active / planning sprints",
                color: "text-amber-600",
                icon: <Clock size={16} className="text-amber-500" />,
              },
              {
                label: "Predicted Sprints",
                value: predictedSprints !== null ? predictedSprints : "—",
                sub: predictedSprints !== null ? "to finish remaining work" : "need more sprint data",
                color: predictedSprints !== null ? "text-violet-600" : "text-slate-400",
                icon: <Target size={16} className={predictedSprints !== null ? "text-violet-500" : "text-slate-300"} />,
              },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                  {s.icon}
                </div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Velocity chart + trend badge */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900">Velocity Chart</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Estimated vs completed hours per sprint</p>
              </div>
              <span className={`flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full border ${trendCfg.cls}`}>
                {trendCfg.icon}
                {trendCfg.label}
              </span>
            </div>
            <div className="px-4 pt-4 pb-2">
              <VelocityChart sprints={sprintVelocity} avgVelocity={avgVelocity} />
            </div>
          </div>

          {/* Sprint completion trend table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-900">Sprint Completion Trend</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Task and hour completion per sprint, oldest → newest</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 font-bold">Sprint</th>
                    <th className="text-left px-4 py-3 font-bold">Status</th>
                    <th className="text-right px-4 py-3 font-bold">Tasks Done</th>
                    <th className="text-right px-4 py-3 font-bold">Est Hours</th>
                    <th className="text-right px-4 py-3 font-bold">Actual Hours</th>
                    <th className="px-4 py-3 font-bold w-36">Completion</th>
                    <th className="text-right px-4 py-3 font-bold">Δ vs prev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sprintVelocity.map((sp: any, i: number) => {
                    const prev = i > 0 ? sprintVelocity[i - 1] : null;
                    const delta = prev !== null ? sp.completionRate - prev.completionRate : null;
                    const deltaColor = delta === null ? "text-slate-300"
                      : delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-slate-400";
                    const deltaStr = delta === null ? "—"
                      : delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : "±0%";
                    const rateColor = sp.completionRate >= 80 ? "#10b981"
                      : sp.completionRate >= 50 ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={sp.sprintId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-800 text-xs">{sp.sprintName}</span>
                          <span className="block text-[10px] text-slate-400">{sp.durationDays}d</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sp.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : sp.status === "active" ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {sp.status === "active" ? "Active" : sp.status === "completed" ? "Done" : "Planning"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono">
                          <span className="font-bold text-slate-800">{sp.completedTasks}</span>
                          <span className="text-slate-400">/{sp.totalTasks}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">
                          {sp.completedEstHours}h<span className="text-slate-300">/{sp.estimatedHours}h</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono">
                          {sp.actualHours !== null
                            ? <span className="font-semibold text-slate-800">{sp.actualHours}h</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 w-36">
                          <CompletionBar pct={sp.completionRate} color={rateColor} />
                        </td>
                        <td className={`px-4 py-3 text-right text-xs font-black ${deltaColor}`}>
                          {deltaStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-member performance */}
          {memberVelocity.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award size={14} className="text-violet-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Member Performance</h3>
                  <p className="text-[11px] text-slate-400">Task completion rate &amp; hours across all completed sprints</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-5 py-3 font-bold">Member</th>
                      <th className="text-right px-4 py-3 font-bold">Tasks Done</th>
                      <th className="text-right px-4 py-3 font-bold">Sprints</th>
                      <th className="text-right px-4 py-3 font-bold">Est Hours</th>
                      <th className="text-right px-4 py-3 font-bold">Actual Hours</th>
                      <th className="text-right px-4 py-3 font-bold">Avg h/sprint</th>
                      <th className="px-4 py-3 font-bold w-36">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {memberVelocity.map((m: any, i: number) => {
                      const rateColor = m.completionRate >= 80 ? "#10b981"
                        : m.completionRate >= 50 ? "#f59e0b" : "#ef4444";
                      return (
                        <tr key={m.memberId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                              >
                                {(m.name || "?").trim().split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 text-xs truncate">{m.name}</div>
                                {m.role && <div className="text-[10px] text-slate-400 truncate">{m.role}</div>}
                              </div>
                              {i === 0 && (
                                <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">TOP</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono">
                            <span className="font-bold text-slate-800">{m.totalCompleted}</span>
                            <span className="text-slate-400">/{m.totalAssigned}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-500">{m.sprintCount}</td>
                          <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">{m.totalEstHours}h</td>
                          <td className="px-4 py-3 text-right text-xs font-mono">
                            {m.totalActualHours !== null
                              ? <span className="font-semibold text-slate-800">{m.totalActualHours}h</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-mono text-indigo-600 font-bold">{m.avgHoursPerSprint}h</td>
                          <td className="px-4 py-3 w-36">
                            <CompletionBar pct={m.completionRate} color={rateColor} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Predictive timeline banner */}
          {predictedSprints !== null && avgVelocity > 0 && (
            <div className={`rounded-2xl border p-5 flex items-start gap-4 ${
              predictedSprints === 0
                ? "bg-emerald-50 border-emerald-200"
                : velocityTrend === "declining"
                ? "bg-red-50 border-red-200"
                : "bg-indigo-50 border-indigo-200"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                predictedSprints === 0 ? "bg-emerald-100" : velocityTrend === "declining" ? "bg-red-100" : "bg-indigo-100"
              }`}>
                <Rocket size={17} className={
                  predictedSprints === 0 ? "text-emerald-600"
                  : velocityTrend === "declining" ? "text-red-600" : "text-indigo-600"
                } />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm mb-0.5 ${
                  predictedSprints === 0 ? "text-emerald-800"
                  : velocityTrend === "declining" ? "text-red-800" : "text-indigo-900"
                }`}>
                  {predictedSprints === 0
                    ? "All remaining work fits in the current sprint!"
                    : `~${predictedSprints} more sprint${predictedSprints !== 1 ? "s" : ""} needed to finish remaining work`}
                </p>
                <p className={`text-xs ${
                  predictedSprints === 0 ? "text-emerald-600"
                  : velocityTrend === "declining" ? "text-red-600" : "text-indigo-600"
                }`}>
                  Based on avg velocity of <span className="font-bold">{avgVelocity}h/sprint</span> and <span className="font-bold">{totalRemainingHours}h</span> of remaining work.
                  {velocityTrend === "improving" && " Velocity is improving — actual time may be less."}
                  {velocityTrend === "declining" && " Warning: velocity is declining — actual time may be more."}
                  {velocityTrend === "stable" && " Velocity is stable."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer links */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={`/dashboard/projects/${id}/allocation`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Users size={13} /> Manage Allocation
        </Link>
        <Link
          href={`/dashboard/projects/${id}/risk-radar`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
        >
          <Shield size={13} /> AI Risk Radar
        </Link>
        <Link
          href={`/dashboard/projects/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
        >
          <ArrowRight size={13} /> Project Blueprint
        </Link>
      </div>

    </div>
  );
}
