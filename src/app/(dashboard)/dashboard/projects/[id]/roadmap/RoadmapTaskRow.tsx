"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Flame,
  Zap,
} from "lucide-react";
import { toggleAssignmentStatus } from "./actions";

interface RoadmapTaskRowProps {
  item: any;
  weeks: number[];
  totalWeeks: number;
  projectId: string;
  todayWeek: number;
}

type CellState = "completed" | "overdue" | "today" | "upcoming" | "empty";

export default function RoadmapTaskRow({
  item,
  weeks,
  totalWeeks,
  projectId,
  todayWeek,
}: RoadmapTaskRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(item.status);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUpdating) return;

    setIsUpdating(true);
    const prevStatus = optimisticStatus;
    setOptimisticStatus(prevStatus === "completed" ? "pending" : "completed");

    try {
      const res = await toggleAssignmentStatus(
        item.id,
        projectId,
        item.task_name,
        prevStatus,
        item.resource?.id
      );
      if (res.success) {
        setOptimisticStatus(res.newStatus);
      } else {
        setOptimisticStatus(prevStatus);
      }
    } catch (err) {
      console.error(err);
      setOptimisticStatus(prevStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getCellState = (w: number): CellState => {
    const isTaskWeek = w === item.week_number;
    if (!isTaskWeek) return "empty";
    if (optimisticStatus === "completed") return "completed";
    if (w < todayWeek) return "overdue";
    if (w === todayWeek) return "today";
    return "upcoming";
  };

  const cellStyles: Record<CellState, string> = {
    completed: "bg-emerald-100 border-emerald-200 text-emerald-700 shadow-emerald-100/80",
    overdue: "bg-red-100 border-red-200 text-red-700 shadow-red-100/80 animate-pulse",
    today: "bg-indigo-100 border-indigo-300 text-indigo-700 shadow-indigo-100/80 ring-1 ring-indigo-400/30",
    upcoming: "bg-amber-50 border-amber-200 text-amber-700",
    empty: "",
  };

  const cellIcon = (state: CellState) => {
    if (isUpdating) return <Loader2 size={14} className="animate-spin text-indigo-500" />;
    switch (state) {
      case "completed": return <CheckCircle2 size={14} />;
      case "overdue": return <Flame size={14} />;
      case "today": return <Zap size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const rowBg =
    optimisticStatus === "completed"
      ? "bg-emerald-50/30"
      : item.week_number < todayWeek
      ? "bg-red-50/20"
      : "";

  return (
    <div
      className={`grid hover:bg-slate-50 transition-all duration-200 group cursor-pointer ${rowBg}`}
      style={{ gridTemplateColumns: `250px repeat(${totalWeeks}, 1fr)` }}
      onClick={handleToggle}
      title="Click to mark as complete / reopen"
    >
      {/* Left Label */}
      <div className="p-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors border-r border-slate-200 z-10 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          {optimisticStatus === "completed" ? (
            <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
          ) : item.week_number < todayWeek ? (
            <Flame size={13} className="text-red-400 flex-shrink-0 animate-pulse" />
          ) : (
            <Clock size={13} className="text-slate-300 flex-shrink-0" />
          )}
          <span
            className={`font-semibold text-sm truncate ${
              optimisticStatus === "completed"
                ? "line-through text-slate-400"
                : "text-slate-900"
            }`}
            title={item.task_name}
          >
            {item.task_name}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1.5 ml-5">
          {item.resource ? (
            <>
              <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0">
                {(item.resource.full_name || "?").charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-500 truncate">
                {item.resource.full_name}
              </span>
            </>
          ) : (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle size={10} /> Unassigned
            </span>
          )}
        </div>
      </div>

      {/* Week Cells */}
      {weeks.map((w) => {
        const state = getCellState(w);

        if (state === "empty") {
          return (
            <div
              key={w}
              className={`border-r border-slate-50 last:border-0 ${
                w === todayWeek ? "bg-indigo-50/20" : ""
              }`}
            />
          );
        }

        return (
          <div
            key={w}
            className={`relative p-1.5 border-r border-slate-50 flex items-center ${
              w === todayWeek ? "bg-indigo-50/20" : ""
            }`}
          >
            <div
              className={`w-full h-9 rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all duration-300 ${cellStyles[state]}`}
            >
              {cellIcon(state)}
              <span className="hidden sm:block capitalize">
                {isUpdating ? "Saving..." : state}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
