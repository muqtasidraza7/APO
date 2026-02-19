import { createClient } from "../../../utils/supabase/server";
import {
  Plus,
  Folder,
  Clock,
  ArrowRight,
  MoreVertical,
  Calendar,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectsListPage() {
  const supabase = await createClient();

  // 1. Get Current User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Fetch Projects (Ordered by newest)
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-2">
            Manage your active initiatives and track progress.
          </p>
        </div>

        <Link
          href="/dashboard/projects/new"
          className="btn btn-primary flex items-center gap-2 shadow-lg shadow-indigo-100"
        >
          <Plus size={18} />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                {project.ai_status === "completed" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                    <CheckCircle2 size={12} /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                    <Loader2 size={12} className="animate-spin" /> Processing
                  </span>
                )}
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Folder size={24} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors truncate">
                {project.name}
              </h3>

              {/* Summary (Truncated) */}
              <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-6">
                {project.ai_data?.summary ||
                  "AI is generating the project summary..."}
              </p>

              {/* Footer Metrics */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>
                    {project.ai_data?.timeline_weeks
                      ? `${project.ai_data.timeline_weeks} Weeks`
                      : "--"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-24 bg-white border border-slate-200 border-dashed rounded-2xl">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Folder size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Projects Yet</h3>
          <p className="text-slate-500 mt-2 mb-6 max-w-sm mx-auto">
            Upload a project charter to get started. The AI will set everything
            up for you.
          </p>
          <Link href="/dashboard/projects/new" className="btn btn-outline">
            <Plus size={16} className="mr-2" />
            Create First Project
          </Link>
        </div>
      )}
    </div>
  );
}
