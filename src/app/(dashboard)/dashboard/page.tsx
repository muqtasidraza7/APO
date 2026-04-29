import { createClient } from "../../utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  UploadCloud,
  UserPlus,
  ArrowRight,
  Layout,
  Activity,
  Calendar,
  DollarSign,
  Folder,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces(id, name, created_at)")
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.workspace) {
    redirect("/onboarding");
  }

  const workspace = membership.workspace as unknown as { id: string; name: string; created_at: string };
  const workspaceName = workspace.name;

  // Calculate days since workspace creation (fix: was hardcoded "Day 1")
  const daysSinceCreation = Math.max(
    1,
    Math.floor((Date.now() - new Date(workspace.created_at).getTime()) / 86_400_000)
  );

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  // 3.3 Fix: fetch real activity from team_activity instead of simulation_logs
  const { data: recentActivity } = await supabase
    .from("team_activity")
    .select("id, description, activity_type, created_at, metadata")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const hasProjects = projects && projects.length > 0;

  if (!hasProjects) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome to {workspaceName}
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Your HQ is set up. Let's initialize your first project.
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-slate-900">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-slate-500">Day {daysSinceCreation} of Operations</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 group relative bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <UploadCloud size={120} className="text-indigo-600" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Initialize Project with AI
                </h2>
                <p className="text-slate-500 leading-relaxed max-w-md">
                  Don't start from scratch. Upload your Project Charter (PDF) or
                  RFP. Our AI will extract the scope, budget, and timeline
                  automatically.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-4">
                <Link
                  href="/dashboard/projects/new"
                  className="btn btn-primary px-6 py-3 text-base"
                >
                  Upload & Parse Document{" "}
                  <ArrowRight size={18} className="ml-2" />
                </Link>
                  <span className="text-xs text-slate-400 font-medium">
                    PDF only · Max 50MB
                  </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="w-10 h-10 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-700 mb-4 shadow-sm">
                <UserPlus size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                Build your Team
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Invite Workers so the AI can assign tasks based on their skills.
              </p>
              <Link
                href="/dashboard/team"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Manage Team <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.ai_status === "completed");
  const totalBudget = activeProjects.reduce(
    (sum, p) => sum + (p.ai_data?.budget_estimate || 0),
    0
  );
  const recentProject = activeProjects[0] || projects[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">
            Executive Overview
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Workspace Performance
          </h1>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="btn btn-primary shadow-lg shadow-indigo-100"
        >
          <Sparkles size={18} className="mr-2" /> New AI Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <Folder size={14} /> Active Projects
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {projects.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <DollarSign size={14} /> Pipeline Value
          </div>
          <div className="text-3xl font-bold text-slate-900">
            ${totalBudget.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2 text-xs font-bold uppercase tracking-wider">
            <Activity size={14} /> Health Score
          </div>
          <div className="text-3xl font-bold text-green-600">
            {Math.round((activeProjects.length / Math.max(projects.length, 1)) * 100)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">{activeProjects.length}/{projects.length} analysed</div>
        </div>

        <div className="bg-indigo-600 p-5 rounded-xl border border-indigo-700 shadow-sm text-white relative overflow-hidden group cursor-pointer hover:bg-indigo-700 transition-colors">
          <Link
            href={
              recentProject
                ? `/dashboard/projects/${recentProject.id}/roadmap`
                : "#"
            }
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 opacity-80 mb-2 text-xs font-bold uppercase tracking-wider">
                <Clock size={14} /> Resume Work
              </div>
              <div className="font-bold text-lg truncate mb-1">
                {recentProject ? recentProject.name : "No Active Work"}
              </div>
              <div className="text-xs opacity-70">
                Last updated{" "}
                {new Date(recentProject?.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Layout size={80} />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">

        <div className="md:col-span-2 space-y-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Activity size={18} className="text-[var(--color-accent)]" />
            Live Activity Feed
          </h3>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {(recentActivity || []).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {(recentActivity || []).map((act: any) => {
                  const isAssignment = act.activity_type === "task_assigned";
                  const timeAgo = new Date(act.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <div key={act.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        isAssignment ? "bg-indigo-400" : "bg-green-400"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900 truncate">
                          <span className="font-semibold">
                            {isAssignment ? "Task Assigned" : act.activity_type?.replace(/_/g, " ")}
                          </span>
                          {act.metadata?.task_title && (
                            <span className="text-slate-600"> — {act.metadata.task_title}</span>
                          )}
                          {act.metadata?.project_name && (
                            <span className="text-slate-400"> in {act.metadata.project_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">
                No activity yet. Assign team members to tasks to see events here.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-slate-900">Quick Access</h3>
          <div className="grid gap-3">
            {projects.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.id}`}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                    <Folder size={14} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-700">
                    {p.name}
                  </span>
                </div>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"
                />
              </Link>
            ))}
          </div>

          <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-xs space-y-4">
            <div className="font-bold text-white uppercase tracking-wider">
              System Status
            </div>
            <div className="flex justify-between">
              <span>AI Engine</span>
              <span className="text-green-400">Online</span>
            </div>
            <div className="flex justify-between">
              <span>Database</span>
              <span className="text-green-400">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
