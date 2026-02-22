"use client";

import { useState } from "react";
import { Play, Loader2, FastForward } from "lucide-react";
import { simulateNextWeek } from "./actions";

export default function SimulationButton({ projectId }: { projectId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulate = async () => {
    setIsLoading(true);
    await simulateNextWeek(projectId);
    setIsLoading(false);
    
  };

  return (
    <button
      onClick={handleSimulate}
      disabled={isLoading}
      className="btn btn-primary shadow-lg shadow-indigo-200 transition-all active:scale-95"
    >
      {isLoading ? (
        <Loader2 size={18} className="mr-2 animate-spin" />
      ) : (
        <Play size={18} className="mr-2 fill-current" />
      )}
      {isLoading ? "Processing..." : "Simulate Next Week"}
    </button>
  );
}
