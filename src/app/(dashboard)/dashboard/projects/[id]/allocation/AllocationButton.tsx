"use client";

import { useState } from "react";
import {
  Sparkles, Loader2, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Users,
} from "lucide-react";
import { runSmartAllocation, confirmAllocation, rejectAllocation } from "./actions";

export default function AllocationButton({
  projectId,
  isReRun = false,
}: {
  projectId: string;
  isReRun?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "confirm" | "confirming" | "rejecting" | "done" | "error">("idle");
  const [assignedCount, setAssignedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRunAI = async () => {
    setPhase("loading");
    setErrorMsg("");
    try {
      const result = await runSmartAllocation(projectId);
      if (result?.error) {
        setErrorMsg(result.error);
        setPhase("error");
      } else {
        setAssignedCount(result.assigned_count ?? 0);
        setPhase("confirm"); 
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setPhase("error");
    }
  };

  const handleConfirm = async () => {
    setPhase("confirming");
    try {
      const result = await confirmAllocation(projectId);
      if (result?.error) {
        setErrorMsg(result.error);
        setPhase("error");
      } else {
        setPhase("done");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setErrorMsg("Failed to confirm. Please try again.");
      setPhase("error");
    }
  };

  const handleReject = async () => {
    setPhase("rejecting");
    try {
      await rejectAllocation(projectId);
      window.location.reload();
    } catch {
      setPhase("idle");
    }
  };

  if (phase === "confirm" || phase === "confirming" || phase === "rejecting") {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm w-full">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-amber-700" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">
              AI proposed {assignedCount} assignment{assignedCount !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Review the team below. Accept to apply workload to members, or reject to discard.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleReject}
            disabled={phase === "confirming" || phase === "rejecting"}
            className="px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {phase === "rejecting" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <XCircle size={15} />
            )}
            Reject
          </button>
          <button
            onClick={handleConfirm}
            disabled={phase === "confirming" || phase === "rejecting"}
            className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {phase === "confirming" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {phase === "confirming" ? "Applying..." : "Accept Team"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold">
        <CheckCircle2 size={16} /> Team confirmed! Updating workload...
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl w-full">
        <div className="flex items-center gap-2 flex-1 text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
        <button
          onClick={() => setPhase("idle")}
          className="text-xs font-semibold text-red-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isReRun) {
    return (
      <button
        onClick={handleRunAI}
        disabled={phase === "loading"}
        className="btn btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
      >
        {phase === "loading" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        {phase === "loading" ? "Analyzing..." : "Re-Run Analysis"}
      </button>
    );
  }

  return (
    <button
      onClick={handleRunAI}
      disabled={phase === "loading"}
      className="btn btn-primary px-6 py-3 flex items-center gap-2 shadow-lg shadow-indigo-100"
    >
      {phase === "loading" ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Sparkles size={18} />
      )}
      {phase === "loading" ? "Matching Skills..." : "Auto-Assign Team"}
    </button>
  );
}
