"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { runSmartAllocation } from "./actions";
import { div } from "framer-motion/client";

export default function AllocationButton({
  projectId,
  isReRun = false,
}: {
  projectId: string;
  isReRun?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await runSmartAllocation(projectId);

      if (result?.error) {
        alert("Error: " + result.error); // Now you will see WHY it failed
      } else {
        // Success - Reload to see new data
        window.location.reload();
      }
    } catch (e) {
      alert("System Error: Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isReRun) {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="btn btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <RefreshCw size={16} />
        )}
        {isLoading ? "Analyzing..." : "Re-Run Analysis"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="btn btn-primary px-6 py-3 flex items-center gap-2 shadow-lg shadow-indigo-100"
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Sparkles size={18} />
      )}
      {isLoading ? "Matching Skills..." : "Auto-Assign Team"}
    </button>
  );
}
