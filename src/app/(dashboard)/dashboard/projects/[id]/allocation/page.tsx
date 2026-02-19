import { createClient } from "../../../../../utils/supabase/server";
import {
  Sparkles,
  Users,
  ArrowRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { runSmartAllocation } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import AllocationButton from "./AllocationButton"; // Assuming you made this component earlier

// ... (keep Assignment type definition) ...
type Assignment = {
  id: string;
  task_name: string;
  week_number: number;
  match_reason: string;
  resource: {
    full_name: string;
    job_title: string;
    skills: string[];
  } | null;
};

export default async function AllocationPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Project
  const { data: project } = await supabase
    .from("projects")
    .select("name, workspace_id")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  // 2. Fetch Assignments
  const { data: rawAssignments } = await supabase
    .from("project_assignments")
    .select(
      `
      id, task_name, week_number, match_reason,
      resource:team_resources(full_name, job_title, skills)
    `
    )
    .eq("project_id", id)
    .order("week_number", { ascending: true });

  const assignments = rawAssignments as unknown as Assignment[];
  const hasAssignments = assignments && assignments.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1. Header Navigation */}
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-4"
        >
          <ArrowLeft size={14} />
          Back to Project Blueprint
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Resource Allocation
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              AI-driven staffing for{" "}
              <span className="font-semibold text-slate-700">
                "{project.name}"
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* --- NEW BUTTON: View Roadmap (Visible only if assigned) --- */}
            {hasAssignments && (
              <Link
                href={`/dashboard/projects/${id}/roadmap`}
                className="btn btn-primary px-4 py-2.5 flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Calendar size={18} />
                View Roadmap
              </Link>
            )}

            {hasAssignments ? (
              <AllocationButton projectId={id} isReRun={true} />
            ) : (
              <AllocationButton projectId={id} />
            )}
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 2. MAIN CONTENT AREA */}
      {hasAssignments ? (
        <div className="space-y-4">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">Timeline</div>
            <div className="col-span-4">Milestone Task</div>
            <div className="col-span-4">Assigned Resource</div>
            <div className="col-span-3">AI Reasoning</div>
          </div>

          {/* Assignment Cards */}
          {assignments.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-6 md:p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center shadow-sm hover:shadow-md transition-all"
            >
              {/* Timeline */}
              <div className="md:col-span-1 flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-100 text-slate-600">
                  <span className="text-[10px] uppercase font-bold">Week</span>
                  <span className="text-sm font-bold">{item.week_number}</span>
                </div>
              </div>

              {/* Task */}
              <div className="md:col-span-4">
                <h3 className="font-bold text-slate-900 text-base">
                  {item.task_name}
                </h3>
              </div>

              {/* Resource */}
              <div className="md:col-span-4">
                {item.resource ? (
                  <div className="flex items-center gap-3 bg-indigo-50/50 p-2 rounded-lg border border-transparent">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-100 text-xs shadow-sm">
                      {item.resource.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {item.resource.full_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Briefcase size={10} />
                        {item.resource.job_title}
                      </div>
                    </div>
                    <CheckCircle2
                      size={16}
                      className="text-green-500 ml-auto mr-2"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-red-50 p-2 rounded-lg border border-red-100 text-red-600">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">Unassigned</span>
                  </div>
                )}
              </div>

              {/* AI Reasoning */}
              <div className="md:col-span-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 italic leading-relaxed">
                  <Sparkles
                    size={10}
                    className="inline mr-1 text-[var(--color-accent)]"
                  />
                  "{item.match_reason}"
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* --- EMPTY STATE --- */
        <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
            <Users size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Ready to Staff
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
            Your project plan is ready. Let the AI match your team's skills to
            the milestones automatically.
          </p>
          <AllocationButton projectId={id} />
        </div>
      )}
    </div>
  );
}
