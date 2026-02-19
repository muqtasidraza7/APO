import { createClient } from "../../../../../utils/supabase/server";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import SimulationButton from "./SimulationButton";

export default async function RoadmapPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Project with LIVE status
  const { data: project } = await supabase
    .from("projects")
    .select("name, ai_data, current_week, simulation_logs")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  const currentWeek = project.current_week || 0;
  const logs = project.simulation_logs || [];

  // 2. Fetch Assignments
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select(
      `
      id, task_name, week_number, status,
      resource:team_resources(full_name, avatar_url)
    `
    )
    .eq("project_id", id)
    .order("week_number", { ascending: true });

  const totalWeeks = project.ai_data?.timeline_weeks || 12;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const progressPercent = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/projects/${id}/allocation`}
            className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} /> Back to Allocation
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Live Roadmap</h1>
          <p className="text-slate-500 mt-1">
            Tracking execution for{" "}
            <span className="font-semibold text-slate-700">
              "{project.name}"
            </span>
          </p>
        </div>

        {/* THE REAL BUTTON */}
        <SimulationButton projectId={id} />
      </div>

      {/* GANTT CHART */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
        {/* Current Week Vertical Line Indicator */}
        {currentWeek > 0 && currentWeek <= totalWeeks && (
          <div
            className="absolute top-0 bottom-0 border-r-2 border-red-400 z-20 pointer-events-none"
            style={{
              left: `calc(250px + ((100% - 250px) / ${totalWeeks}) * ${currentWeek})`,
            }}
          >
            <div className="bg-red-500 text-white text-[10px] font-bold px-1 py-0.5 absolute -right-4 top-0 rounded-b-md">
              NOW
            </div>
          </div>
        )}

        {/* Timeline Header */}
        <div
          className="grid border-b border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: `250px repeat(${totalWeeks}, 1fr)` }}
        >
          <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 border-r border-slate-200 z-10">
            Task / Resource
          </div>
          {weeks.map((w) => (
            <div
              key={w}
              className={`p-4 text-center border-r border-slate-100 last:border-0 ${
                w === currentWeek ? "bg-indigo-50/50" : ""
              }`}
            >
              <span
                className={`text-xs font-bold ${
                  w <= currentWeek ? "text-slate-800" : "text-slate-400"
                }`}
              >
                W{w}
              </span>
            </div>
          ))}
        </div>

        {/* Tasks Rows */}
        <div className="divide-y divide-slate-100">
          {assignments?.map((item: any) => (
            <div
              key={item.id}
              className="grid hover:bg-slate-50/50 transition-colors group"
              style={{
                gridTemplateColumns: `250px repeat(${totalWeeks}, 1fr)`,
              }}
            >
              {/* Left Column */}
              <div className="p-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors border-r border-slate-200 z-10 flex flex-col justify-center">
                <div
                  className="font-semibold text-sm text-slate-900 truncate"
                  title={item.task_name}
                >
                  {item.task_name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {item.resource ? (
                    <>
                      <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-700">
                        {item.resource.full_name.charAt(0)}
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

              {/* Timeline Cells */}
              {weeks.map((w) => {
                const isTaskWeek = w === item.week_number;
                const isCompleted =
                  item.status === "completed" || w <= currentWeek; // Logic: If current week passed task week

                if (!isTaskWeek)
                  return <div key={w} className="border-r border-slate-50" />;

                // The Task Bar
                return (
                  <div
                    key={w}
                    className="relative p-2 border-r border-slate-50 flex items-center"
                  >
                    <div
                      className={`w-full h-8 rounded-lg shadow-sm flex items-center justify-center text-xs font-medium border transition-all duration-500 ${
                        isCompleted
                          ? "bg-green-100 border-green-200 text-green-700"
                          : "bg-indigo-100 border-indigo-200 text-indigo-700"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM PANEL: AI MONITOR & STATUS */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* AI Monitor (Live Logs) */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-2 shadow-xl shadow-slate-200">
          <h3 className="font-bold flex items-center gap-2 mb-4 text-lg">
            <Activity size={18} className="text-green-400" />
            AI Project Monitor
          </h3>
          <div className="space-y-4 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic">
                Waiting for simulation to start...
              </div>
            ) : (
              logs.map((log: any, i: number) => (
                <div
                  key={i}
                  className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-500"
                >
                  <span className="text-slate-500 min-w-[80px]">
                    [{log.timestamp}]
                  </span>
                  <span className="font-bold text-indigo-400">
                    W{log.week}:
                  </span>
                  <span
                    className={
                      log.type === "warning"
                        ? "text-amber-400"
                        : "text-slate-300"
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-bold uppercase">
            <Calendar size={14} /> Current Status
          </div>
          <div className="text-4xl font-bold text-slate-900 mb-1">
            {currentWeek === 0 ? "Kickoff" : `Week ${currentWeek}`}
          </div>
          <div className="text-sm text-slate-400">of {totalWeeks} Weeks</div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Completion</span>
              <span className="font-bold text-indigo-600">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
