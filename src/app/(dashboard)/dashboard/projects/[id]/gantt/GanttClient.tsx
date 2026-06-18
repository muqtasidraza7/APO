"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronRight, Calendar,
  MapPin, Flag, Zap, Map,
} from "lucide-react";

interface Milestone {
  title: string;
  week?: number;
  week_number?: number;
  status?: string;
  deliverable?: string;
}

interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Props {
  projectId: string;
  projectName: string;
  projectStart: string;
  totalWeeks: number;
  milestones: Milestone[];
  sprints: Sprint[];
}

// ── Color maps ─────────────────────────────────────────────────────────────────

const MS_COLORS: Record<string, { bar: string; glow: string; badge: string; badgeText: string }> = {
  completed: { bar: "#10b981", glow: "#10b98130", badge: "#d1fae5", badgeText: "#065f46" },
  live:      { bar: "#6366f1", glow: "#6366f130", badge: "#e0e7ff", badgeText: "#3730a3" },
  upcoming:  { bar: "#94a3b8", glow: "#94a3b820", badge: "#f1f5f9", badgeText: "#475569" },
  blocked:   { bar: "#ef4444", glow: "#ef444430", badge: "#fee2e2", badgeText: "#991b1b" },
};

const SP_COLORS: Record<string, { bar: string; glow: string }> = {
  active:    { bar: "#f97316", glow: "#f9731630" },
  planning:  { bar: "#8b5cf6", glow: "#8b5cf630" },
  completed: { bar: "#10b981", glow: "#10b98130" },
};

const ROW_H = 44;
const GROUP_H = 34;
const HEADER_H = 52;

function msColor(status?: string) {
  return MS_COLORS[status || "upcoming"] ?? MS_COLORS.upcoming;
}
function spColor(status: string) {
  return SP_COLORS[status] ?? SP_COLORS.planning;
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ label, sub, color, x, y }: { label: string; sub: string; color: string; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none fixed z-50 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-2xl max-w-[220px]"
      style={{ left: x + 14, top: y - 10 }}
    >
      <div
        className="w-2 h-2 rounded-sm inline-block mr-1.5 mb-0.5"
        style={{ backgroundColor: color, verticalAlign: "middle" }}
      />
      <span className="font-bold">{label}</span>
      <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GanttClient({ projectId, projectName, projectStart, totalWeeks, milestones, sprints }: Props) {
  const [msCollapsed, setMsCollapsed] = useState(false);
  const [spCollapsed, setSpCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; sub: string; color: string; x: number; y: number } | null>(null);

  // ── Timeline bounds ──────────────────────────────────────────────────────────
  const pStart = new Date(projectStart);
  let timelineEnd = new Date(pStart.getTime() + totalWeeks * 7 * 86_400_000);

  sprints.forEach((s) => {
    const e = new Date(s.end_date);
    if (e > timelineEnd) timelineEnd = e;
  });
  // +10 day buffer so the last bar isn't flush against the edge
  timelineEnd = new Date(timelineEnd.getTime() + 10 * 86_400_000);

  // Snap timeline start to Monday of the project start week
  const snap = new Date(pStart);
  snap.setDate(snap.getDate() - ((snap.getDay() + 6) % 7));
  const timelineStart = snap;

  const totalMs = timelineEnd.getTime() - timelineStart.getTime();

  function leftPct(date: Date) {
    return Math.max(0, (date.getTime() - timelineStart.getTime()) / totalMs * 100);
  }
  function widthPct(start: Date, end: Date) {
    return Math.max(0.4, leftPct(end) - leftPct(start));
  }

  // ── Week markers ─────────────────────────────────────────────────────────────
  const weekMarkers: { label: string; pct: number; isMonth: boolean }[] = [];
  let cur = new Date(timelineStart);
  let lastMonth = -1;
  while (cur <= timelineEnd) {
    const month = cur.getMonth();
    const isMonth = month !== lastMonth;
    if (isMonth) lastMonth = month;
    weekMarkers.push({
      label: isMonth
        ? cur.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : cur.toLocaleDateString("en-US", { day: "numeric" }),
      pct: leftPct(cur),
      isMonth,
    });
    cur = new Date(cur.getTime() + 7 * 86_400_000);
  }

  // Today marker
  const today = new Date();
  const todayPct = leftPct(today);
  const showToday = todayPct >= 0 && todayPct <= 100;

  // ── Build row data ────────────────────────────────────────────────────────────
  const msRows = milestones.map((ms, i) => {
    const week = ms.week ?? ms.week_number ?? i + 1;
    const start = new Date(pStart.getTime() + (week - 1) * 7 * 86_400_000);
    const end = new Date(pStart.getTime() + week * 7 * 86_400_000);
    const status = ms.status ?? "upcoming";
    const c = msColor(status);
    const dateRange = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    return { id: `ms-${i}`, label: ms.title, sub: `Week ${week} · ${dateRange}`, start, end, color: c.bar, glow: c.glow, status };
  });

  const spRows = sprints.map((s) => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    const c = spColor(s.status);
    const dateRange = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    return { id: s.id, label: s.name, sub: `${dateRange} · ${days}d`, start, end, color: c.bar, glow: c.glow, status: s.status };
  });

  // ── Chart height ─────────────────────────────────────────────────────────────
  const msHeight = (msCollapsed ? 0 : msRows.length * ROW_H) + GROUP_H;
  const spHeight = (spCollapsed ? 0 : spRows.length * ROW_H) + GROUP_H;
  const chartBodyHeight = msHeight + spHeight;

  // ── Min-width for readable bars (~18px per day) ───────────────────────────────
  const totalDays = totalMs / 86_400_000;
  const minWidth = Math.max(800, totalDays * 18);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-600 transition-colors mb-2"
          >
            <ArrowLeft size={14} /> Back to {projectName}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Gantt Chart
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {milestones.length} milestone{milestones.length !== 1 ? "s" : ""} · {sprints.length} sprint{sprints.length !== 1 ? "s" : ""} · {totalWeeks} week timeline
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/dashboard/projects/${projectId}/roadmap`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Map size={14} /> Timeline View
          </Link>
          <Link
            href={`/dashboard/projects/${projectId}/sprints`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Zap size={14} /> Sprints
          </Link>
        </div>
      </div>

      {/* Chart card */}
      {milestones.length === 0 && sprints.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <Flag size={32} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-700 mb-1">No data to display</h2>
          <p className="text-sm text-slate-400">
            Run AI analysis to generate milestones, then create sprints to populate the chart.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex">

            {/* ── Sidebar ─────────────────────────────────────────────────────── */}
            <div className="w-52 flex-shrink-0 border-r border-slate-200">
              {/* Sidebar header */}
              <div
                className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white flex items-end px-4 pb-3"
                style={{ height: HEADER_H }}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</span>
              </div>

              {/* Milestones group */}
              <button
                onClick={() => setMsCollapsed((c) => !c)}
                className="w-full flex items-center gap-2 px-4 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
                style={{ height: GROUP_H }}
              >
                {msCollapsed
                  ? <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
                  : <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />}
                <Flag size={11} className="text-indigo-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Milestones</span>
                <span className="ml-auto text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                  {msRows.length}
                </span>
              </button>
              {!msCollapsed && msRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center px-4 border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                  style={{ height: ROW_H }}
                >
                  <div className="w-2 h-2 rounded-sm flex-shrink-0 mr-2" style={{ backgroundColor: row.color }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{row.label}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">{row.sub.split("·")[0].trim()}</p>
                  </div>
                </div>
              ))}

              {/* Sprints group */}
              <button
                onClick={() => setSpCollapsed((c) => !c)}
                className="w-full flex items-center gap-2 px-4 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
                style={{ height: GROUP_H }}
              >
                {spCollapsed
                  ? <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
                  : <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />}
                <Zap size={11} className="text-violet-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Sprints</span>
                <span className="ml-auto text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
                  {spRows.length}
                </span>
              </button>
              {!spCollapsed && spRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center px-4 border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                  style={{ height: ROW_H }}
                >
                  <div className="w-2 h-2 rounded-sm flex-shrink-0 mr-2" style={{ backgroundColor: row.color }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{row.label}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">{row.sub.split("·")[0].trim()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Timeline panel ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-x-auto">
              <div className="relative" style={{ minWidth: minWidth }}>

                {/* ── Week / month header ───────────────────────────────────────── */}
                <div
                  className="relative border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white"
                  style={{ height: HEADER_H }}
                >
                  {weekMarkers.map((wm, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex flex-col justify-end pb-2"
                      style={{ left: `${wm.pct}%`, borderLeft: wm.isMonth ? "1px solid #e2e8f0" : "1px dashed #f1f5f9" }}
                    >
                      <span
                        className={`pl-1.5 whitespace-nowrap text-[10px] font-${wm.isMonth ? "bold" : "medium"} ${wm.isMonth ? "text-slate-600" : "text-slate-400"}`}
                      >
                        {wm.label}
                      </span>
                    </div>
                  ))}
                  {/* Today badge in header */}
                  {showToday && (
                    <div
                      className="absolute bottom-1.5 flex flex-col items-center"
                      style={{ left: `${todayPct}%`, transform: "translateX(-50%)" }}
                    >
                      <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                        TODAY
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Chart body ───────────────────────────────────────────────── */}
                <div className="relative" style={{ height: chartBodyHeight }}>

                  {/* Background grid lines */}
                  {weekMarkers.map((wm, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        left: `${wm.pct}%`,
                        borderLeft: wm.isMonth ? "1px solid #f1f5f9" : "1px dashed #f8fafc",
                      }}
                    />
                  ))}

                  {/* Today vertical line */}
                  {showToday && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-10"
                      style={{ left: `${todayPct}%`, borderLeft: "2px solid #6366f1" }}
                    />
                  )}

                  {/* ── Milestone group header ──────────────────────────────────── */}
                  <div
                    className="bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-200 flex items-center px-4 gap-2"
                    style={{ height: GROUP_H }}
                  >
                    <Flag size={11} className="text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Milestones — {totalWeeks} week plan
                    </span>
                  </div>

                  {/* ── Milestone bars ────────────────────────────────────────────── */}
                  {!msCollapsed && msRows.map((row) => (
                    <div
                      key={row.id}
                      className="relative border-b border-slate-100"
                      style={{ height: ROW_H }}
                    >
                      {/* Bar */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded-lg flex items-center px-2.5 overflow-hidden cursor-default select-none"
                        style={{
                          left: `${leftPct(row.start)}%`,
                          width: `${widthPct(row.start, row.end)}%`,
                          height: 28,
                          backgroundColor: row.color,
                          minWidth: 8,
                          boxShadow: `0 2px 8px ${row.glow}`,
                        }}
                        onMouseEnter={(e) =>
                          setTooltip({ label: row.label, sub: row.sub, color: row.color, x: e.clientX, y: e.clientY })
                        }
                        onMouseMove={(e) =>
                          setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-[10px] font-bold text-white truncate leading-none drop-shadow-sm">
                          {row.label}
                        </span>
                      </div>

                      {/* Milestone diamond endpoint */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-2 border-white z-10 pointer-events-none"
                        style={{
                          left: `${leftPct(row.end)}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  ))}

                  {/* ── Sprint group header ───────────────────────────────────────── */}
                  <div
                    className="bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-200 flex items-center px-4 gap-2"
                    style={{ height: GROUP_H }}
                  >
                    <Zap size={11} className="text-violet-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Sprints
                    </span>
                  </div>

                  {/* ── Sprint bars ───────────────────────────────────────────────── */}
                  {!spCollapsed && spRows.map((row) => (
                    <div
                      key={row.id}
                      className="relative border-b border-slate-100"
                      style={{ height: ROW_H }}
                    >
                      {/* Subtle background fill for the sprint span */}
                      <div
                        className="absolute top-0 bottom-0 opacity-[0.06] pointer-events-none"
                        style={{
                          left: `${leftPct(row.start)}%`,
                          width: `${widthPct(row.start, row.end)}%`,
                          backgroundColor: row.color,
                        }}
                      />
                      {/* Bar */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded-lg flex items-center px-2.5 overflow-hidden cursor-default select-none"
                        style={{
                          left: `${leftPct(row.start)}%`,
                          width: `${widthPct(row.start, row.end)}%`,
                          height: 28,
                          backgroundColor: row.color,
                          minWidth: 8,
                          boxShadow: `0 2px 8px ${row.glow}`,
                        }}
                        onMouseEnter={(e) =>
                          setTooltip({ label: row.label, sub: row.sub, color: row.color, x: e.clientX, y: e.clientY })
                        }
                        onMouseMove={(e) =>
                          setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="text-[10px] font-bold text-white truncate leading-none drop-shadow-sm">
                          {row.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Legend ─────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-5 px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex-wrap">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">Legend</span>
            {[
              { color: "#10b981", label: "Completed" },
              { color: "#6366f1", label: "In Progress" },
              { color: "#94a3b8", label: "Upcoming" },
              { color: "#ef4444", label: "Blocked" },
              { color: "#f97316", label: "Active Sprint" },
              { color: "#8b5cf6", label: "Planned Sprint" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-medium text-slate-600">{label}</span>
              </div>
            ))}
            {showToday && (
              <div className="flex items-center gap-1.5">
                <div className="w-px h-3 bg-indigo-600 flex-shrink-0" />
                <MapPin size={10} className="text-indigo-600" />
                <span className="text-[10px] font-medium text-indigo-600">Today</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-3 rotate-45 border-2 border-slate-400 bg-transparent flex-shrink-0" />
              <span className="text-[10px] font-medium text-slate-500">Milestone end</span>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <Tooltip
          label={tooltip.label}
          sub={tooltip.sub}
          color={tooltip.color}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
