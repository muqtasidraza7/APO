import { createClient } from "../../../../../utils/supabase/server";
import {
    ArrowLeft,
    Calendar,
    AlertTriangle,
    Activity,
    TrendingUp,
    Flame,
    CheckCircle2,
    Clock,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import RoadmapTaskRow from "./RoadmapTaskRow";

export default async function RoadmapPage({
    params,
}: {
    params: { id: string };
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: project } = await supabase
        .from("projects")
        .select("name, workspace_id, ai_data, current_week, created_at")
        .eq("id", id)
        .single();

    if (!project) redirect("/dashboard");

    const { data: activitiesRaw } = await supabase
        .from("team_activity")
        .select("description, created_at, metadata, activity_type")
        .eq("entity_type", "milestone")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(15);

    const { data: assignments } = await supabase
        .from("project_assignments")
        .select(`
      id, task_name, week_number, status,
      resource:team_members(id, job_title)
    `)
        .eq("project_id", id)
        .order("week_number", { ascending: true });

    const totalWeeks = project.ai_data?.timeline_weeks || 12;
    const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    // Calculate today's real week number based on project start date
    const projectStart = new Date(project.created_at);
    const now = new Date();
    const msSinceStart = now.getTime() - projectStart.getTime();
    const daysSinceStart = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));
    const todayWeek = Math.min(Math.max(Math.ceil(daysSinceStart / 7) + 1, 1), totalWeeks);

    // Map assignments with proper full_name
    const mappedAssignments = assignments?.map((item: any) => ({
        ...item,
        resource: item.resource
            ? { ...item.resource, full_name: item.resource.job_title || "Team Member" }
            : null,
    }));

    const totalAssignments = mappedAssignments?.length || 1;
    const completedAssignments = mappedAssignments?.filter((a) => a.status === "completed").length || 0;
    const overdueAssignments = mappedAssignments?.filter((a) => a.status !== "completed" && a.week_number < todayWeek).length || 0;
    const progressPercent = Math.round((completedAssignments / totalAssignments) * 100);

    // Health State
    const health =
        completedAssignments === totalAssignments
            ? "completed"
            : overdueAssignments > 0
            ? "delayed"
            : "on_track";

    const healthConfig = {
        completed: { label: "All Done", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={16} /> },
        delayed: { label: `${overdueAssignments} Overdue`, color: "text-red-700 bg-red-50 border-red-200", icon: <Flame size={16} className="animate-pulse" /> },
        on_track: { label: "On Track", color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: <TrendingUp size={16} /> },
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <Link
                        href={`/dashboard/projects/${id}/allocation`}
                        className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1 mb-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Allocation
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Live Roadmap</h1>
                    <p className="text-slate-500 mt-1">
                        Tracking{" "}
                        <span className="font-semibold text-slate-700">"{project.name}"</span>
                        {" "}— Click any task row to toggle completion.
                    </p>
                </div>

                {/* Health Badge + Stats */}
                <div className="flex flex-col items-end gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${healthConfig[health].color}`}>
                        {healthConfig[health].icon}
                        {healthConfig[health].label}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span><span className="font-bold text-emerald-600">{completedAssignments}</span> done</span>
                        {overdueAssignments > 0 && <span><span className="font-bold text-red-500">{overdueAssignments}</span> overdue</span>}
                        <span><span className="font-bold text-slate-700">{totalAssignments - completedAssignments}</span> remaining</span>
                    </div>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">

                {/* Column Header Row */}
                <div
                    className="grid border-b border-slate-200 bg-slate-50/80"
                    style={{ gridTemplateColumns: `250px repeat(${totalWeeks}, 1fr)` }}
                >
                    <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 border-r border-slate-200 z-10">
                        Task / Resource
                    </div>
                    {weeks.map((w) => {
                        const weekStartDate = new Date(projectStart);
                        weekStartDate.setDate(projectStart.getDate() + (w - 1) * 7);
                        const dateLabel = weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        const isToday = w === todayWeek;
                        const isPast = w < todayWeek;

                        return (
                            <div
                                key={w}
                                className={`p-3 text-center border-r border-slate-100 last:border-0 transition-colors ${isToday ? "bg-indigo-50" : ""}`}
                            >
                                <div className={`text-xs font-bold flex items-center justify-center gap-1 ${isToday ? "text-indigo-700" : isPast ? "text-slate-400" : "text-slate-500"}`}>
                                    {isToday && <Zap size={10} className="text-indigo-500" />}
                                    W{w}
                                    {isToday && <Zap size={10} className="text-indigo-500" />}
                                </div>
                                <div className={`text-[10px] mt-0.5 font-medium ${isToday ? "text-indigo-500 font-bold" : "text-slate-400"}`}>
                                    {isToday ? "TODAY" : dateLabel}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Task Rows */}
                <div className="divide-y divide-slate-100">
                    {!mappedAssignments || mappedAssignments.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No Tasks Assigned</h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                Please go to <strong>Resource Allocation</strong> and run the AI staffer first.
                            </p>
                        </div>
                    ) : (
                        mappedAssignments.map((item: any) => (
                            <RoadmapTaskRow
                                key={item.id}
                                item={item}
                                weeks={weeks}
                                totalWeeks={totalWeeks}
                                projectId={id}
                                todayWeek={todayWeek}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Bottom Cards */}
            <div className="grid md:grid-cols-3 gap-6">

                {/* Activity Feed */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl md:col-span-2 shadow-xl shadow-slate-200/80">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-base">
                        <Activity size={16} className="text-green-400" />
                        Activity Feed
                        <span className="ml-auto text-[10px] text-slate-500 font-normal uppercase tracking-wider">Real-time</span>
                    </h3>
                    <div className="space-y-3 font-mono text-sm max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                        {(!activitiesRaw || activitiesRaw.length === 0) ? (
                            <div className="text-slate-500 italic text-xs">No activity yet — mark a task complete to see the feed update.</div>
                        ) : (
                            activitiesRaw.map((act: any, i: number) => {
                                const isComplete = act.activity_type === "task_completed";
                                const isReopen = act.description?.toLowerCase().includes("reopened");
                                const isAssign = act.activity_type === "task_assigned";

                                const dotColor = isComplete
                                    ? "bg-emerald-400"
                                    : isReopen
                                    ? "bg-amber-400"
                                    : isAssign
                                    ? "bg-indigo-400"
                                    : "bg-slate-500";

                                const textColor = isComplete
                                    ? "text-emerald-300"
                                    : isReopen
                                    ? "text-amber-300"
                                    : "text-slate-300";

                                return (
                                    <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-500">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                                        <span className="text-slate-500 text-xs min-w-[42px] whitespace-nowrap">
                                            {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        <span className={`text-xs leading-relaxed ${textColor}`}>
                                            {act.description}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <Calendar size={12} /> Project Health
                        </div>
                        <div className={`text-3xl font-black mt-2 ${health === "delayed" ? "text-red-600" : health === "completed" ? "text-emerald-600" : "text-slate-900"}`}>
                            {progressPercent}%
                        </div>
                        <div className="text-sm text-slate-400 mt-0.5">
                            {completedAssignments} of {totalAssignments} tasks done
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {/* Progress bar */}
                        <div>
                            <div className="flex justify-between text-xs mb-1.5">
                                <span className="text-slate-500">Completion</span>
                                <span className="font-bold text-indigo-600">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                        health === "delayed" ? "bg-red-500" : "bg-indigo-600"
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Stat Pills */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                            <div className="text-center">
                                <div className="text-base font-bold text-emerald-600">{completedAssignments}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Done</div>
                            </div>
                            <div className="text-center">
                                <div className="text-base font-bold text-red-500">{overdueAssignments}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Overdue</div>
                            </div>
                            <div className="text-center">
                                <div className="text-base font-bold text-slate-700">{todayWeek}</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Week</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
