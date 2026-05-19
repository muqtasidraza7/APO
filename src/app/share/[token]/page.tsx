import { createClient } from "../../utils/supabase/server";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Calendar, FolderKanban, Users, Target } from "lucide-react";

type AiMilestone = { title: string; week: number; status?: string; deliverable?: string };

const STATUS_CFG = {
  completed: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
  active:    { dot: "bg-indigo-500",  badge: "bg-indigo-50 text-indigo-700 border-indigo-200",   label: "Active"    },
  pending:   { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200",     label: "Planning"  },
  planning:  { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200",     label: "Planning"  },
} as const;
type StatusKey = keyof typeof STATUS_CFG;

export default async function SharePage({ params }: { params: { token: string } }) {
  const supabase = await createClient();

  // Look up the share token (public RLS policy allows this without auth)
  const { data: share } = await supabase
    .from("project_shares")
    .select("project_id, workspace_id, expires_at, is_active")
    .eq("token", params.token)
    .eq("is_active", true)
    .maybeSingle();

  if (!share) notFound();
  if (share.expires_at && new Date(share.expires_at) < new Date()) notFound();

  const [{ data: project }, { data: workspace }, { count: teamCount }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, ai_status, ai_data, created_at")
      .eq("id", share.project_id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("workspaces")
      .select("name")
      .eq("id", share.workspace_id)
      .single(),
    supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", share.workspace_id)
      .is("deleted_at", null),
  ]);

  if (!project) notFound();

  const milestones: AiMilestone[] = project.ai_data?.milestones || [];
  const completedMs = milestones.filter((m) => m.status === "completed").length;
  const progressPct = milestones.length > 0 ? Math.round((completedMs / milestones.length) * 100) : 0;

  const upcoming = milestones.filter((m) => m.status !== "completed").slice(0, 20);
  const byWeek = upcoming.reduce<Record<number, AiMilestone[]>>((acc, m) => {
    (acc[m.week] ??= []).push(m);
    return acc;
  }, {});
  const weekGroups = Object.entries(byWeek)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(0, 8);

  const rawStatus = (project.status ?? (project.ai_status === "completed" ? "active" : "pending")) as StatusKey;
  const cfg = STATUS_CFG[rawStatus] ?? STATUS_CFG.pending;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <FolderKanban size={16} className="text-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block leading-none">Shared by</span>
              <span className="text-sm font-bold text-slate-700">{workspace?.name}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Read Only
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Project hero */}
        <div
          className="rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)" }}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-white/15 border-white/25 text-white/90 mb-4 uppercase tracking-wider`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} bg-white`} />
              {cfg.label}
            </span>
            <h1 className="text-3xl font-black tracking-tight mb-2">{project.name}</h1>
            {project.ai_data?.summary && (
              <p className="text-white/60 text-sm leading-relaxed max-w-2xl">{project.ai_data.summary}</p>
            )}
            <p className="text-white/40 text-xs mt-3 flex items-center gap-1.5">
              <Calendar size={12} />
              Created {new Date(project.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
                <Target size={13} className="text-indigo-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Milestones</span>
            </div>
            <div className="text-4xl font-black text-slate-900 leading-none mb-2">{completedMs}<span className="text-xl text-slate-300">/{milestones.length}</span></div>
            {milestones.length > 0 && (
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1.5">{progressPct}% complete</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={13} className="text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</span>
            </div>
            <div className="text-4xl font-black text-slate-900 leading-none mb-2">{completedMs}</div>
            <p className="text-xs text-slate-400">milestones delivered</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-violet-50 border border-violet-100 rounded-lg flex items-center justify-center">
                <Users size={13} className="text-violet-600" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team</span>
            </div>
            <div className="text-4xl font-black text-slate-900 leading-none mb-2">{teamCount ?? 0}</div>
            <p className="text-xs text-slate-400">people on this project</p>
          </div>
        </div>

        {/* Budget / timeline tiles from AI data */}
        {(project.ai_data?.budget_estimate || project.ai_data?.timeline_weeks) && (
          <div className="grid grid-cols-2 gap-4">
            {project.ai_data?.budget_estimate && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Est. Budget</span>
                <p className="text-2xl font-black text-slate-900">
                  {project.ai_data.currency || "$"}{Number(project.ai_data.budget_estimate).toLocaleString()}
                </p>
              </div>
            )}
            {project.ai_data?.timeline_weeks && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Timeline</span>
                <p className="text-2xl font-black text-slate-900">{project.ai_data.timeline_weeks} weeks</p>
              </div>
            )}
          </div>
        )}

        {/* Upcoming milestones */}
        {weekGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Upcoming Milestones</h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold border border-indigo-100 uppercase tracking-wider">
                AI Planned
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {weekGroups.map(([week, wMilestones]) => (
                  <div key={week} className="flex hover:bg-slate-50/50 transition-colors">
                    <div className="w-20 flex-shrink-0 flex items-start justify-center pt-4 pl-4 pb-4">
                      <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg border border-indigo-100 min-w-[42px] text-center">
                        W{week}
                      </div>
                    </div>
                    <div className="flex-1 py-3 pr-4 space-y-2.5">
                      {wMilestones.map((m, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="flex-shrink-0 mt-0.5">
                            {m.status === "completed"
                              ? <CheckCircle2 size={14} className="text-emerald-500" />
                              : <Circle size={14} className="text-slate-300" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-tight">{m.title}</p>
                            {m.deliverable && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{m.deliverable}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All milestones completed */}
        {milestones.length > 0 && upcoming.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-emerald-800 font-bold">All milestones completed!</p>
            <p className="text-emerald-600 text-sm mt-1">This project has delivered all planned milestones.</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-300 pb-4">
          This is a read-only project overview. Shared via APO.
        </p>
      </main>
    </div>
  );
}
