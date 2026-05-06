"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, TrendingDown, Loader2, Calendar, Info, 
  ChevronRight, RefreshCw, BarChart3, Zap
} from "lucide-react";

interface ChartPoint {
  day: number;
  date: string;
  ideal: number;
  actual: number | null;
}

interface BurndownData {
  totalPoints: number;
  chartData: ChartPoint[];
  sprintName: string;
}

export default function BurndownPage() {
  const { id: projectId, sid: sprintId } = useParams() as { id: string; sid: string };
  const [data, setData] = useState<BurndownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sprints/burndown?sprintId=${sprintId}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to load burndown data");
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );

  if (error || !data) return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded-2xl border border-red-100 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
        <Info size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Could Not Load Chart</h2>
      <p className="text-slate-500 mb-6">{error || "Something went wrong."}</p>
      <Link href={`/dashboard/projects/${projectId}/sprints/${sprintId}`} className="btn btn-primary inline-flex items-center gap-2">
        Back to Board
      </Link>
    </div>
  );

  const chartPoints = data.chartData;
  const maxPoints = data.totalPoints || 1;
  
  // Chart dimensions
  const width = 800;
  const height = 400;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const getX = (index: number) => padding + (index * (chartWidth / (chartPoints.length - 1 || 1)));
  const getY = (value: number) => padding + chartHeight - (value * (chartHeight / maxPoints));

  // Generate paths
  const idealPath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.ideal)}`).join(' ');
  
  const actualPoints = chartPoints.filter(p => p.actual !== null);
  const actualPath = actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.actual!)}`).join(' ');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/projects/${projectId}/sprints/${sprintId}`} className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Board
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingDown size={28} className="text-indigo-500" /> 
            {data.sprintName} Burndown
          </h1>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400" title="Refresh data">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-400" /> Remaining Story Points
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-slate-300 border-t border-dashed border-slate-400" />
                <span className="text-slate-500">Ideal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-indigo-500" />
                <span className="text-slate-700">Actual</span>
              </div>
            </div>
          </div>

          <div className="relative aspect-[2/1] w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = getY(maxPoints * pct);
                return (
                  <g key={pct}>
                    <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={padding - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                      {Math.round(maxPoints * pct)}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {chartPoints.map((p, i) => {
                const x = getX(i);
                if (chartPoints.length > 10 && i % Math.ceil(chartPoints.length / 5) !== 0) return null;
                return (
                  <text key={i} x={x} y={height - padding + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-mono">
                    Day {p.day}
                  </text>
                );
              })}

              {/* Ideal Line */}
              <path d={idealPath} fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5,5" />
              
              {/* Actual Line */}
              <path d={actualPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Data Points */}
              {actualPoints.map((p, i) => (
                <circle key={i} cx={getX(p.day)} cy={getY(p.actual!)} r="4" className="fill-white stroke-indigo-600 stroke-2 shadow-sm" />
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Sprint Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Total Story Points</span>
                  <span className="font-bold text-slate-900">{data.totalPoints}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full" />
              </div>
              
              {actualPoints.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Remaining Today</span>
                    <span className="font-bold text-indigo-600">
                      {actualPoints[actualPoints.length - 1].actual}
                    </span>
                  </div>
                  <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000" 
                      style={{ width: `${(actualPoints[actualPoints.length - 1].actual! / maxPoints) * 100}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-50">
              <div className="flex items-start gap-3 text-sm text-slate-600 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <Info size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                  The ideal line represents the expected work remaining if tasks are completed at a constant rate. 
                  Being below the ideal line means your team is ahead of schedule!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 shadow-lg shadow-indigo-200 text-white">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Zap size={18} className="text-indigo-200" /> Quick Insight
            </h3>
            <p className="text-sm text-indigo-100 leading-relaxed mb-4">
              {actualPoints.length > 0 && actualPoints[actualPoints.length - 1].actual! > actualPoints[actualPoints.length - 1].ideal 
                ? "The team is currently slightly behind the ideal burndown. Consider reviewing blockers in the next standup."
                : "The sprint is progressing exceptionally well! Keep up the momentum to finish all planned tasks."}
            </p>
            <div className="flex justify-end">
              <Link href={`/dashboard/projects/${projectId}/sprints/${sprintId}`} className="text-xs font-bold flex items-center gap-1 hover:translate-x-1 transition-transform">
                Go to Kanban Board <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
