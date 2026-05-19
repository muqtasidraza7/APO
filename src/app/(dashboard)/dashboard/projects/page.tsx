import { createClient } from "../../../utils/supabase/server";
import { redirect } from "next/navigation";
import ProjectsClient from "./ProjectsClient";

export default async function ProjectsListPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces(id, name, owner_id)")
    .eq("user_id", user.id)
    .single();

  if (!membership || !membership.workspace) redirect("/onboarding");

  const workspace = membership.workspace as unknown as { id: string; name: string; owner_id: string };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: projects }, { data: deletedProjects }, { data: sprints }, { data: sprintTasks }, { data: member }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      // Soft-deleted within the 30-day recovery window
      supabase
        .from("projects")
        .select("id, name, deleted_at, status, ai_status")
        .eq("workspace_id", workspace.id)
        .not("deleted_at", "is", null)
        .gt("deleted_at", thirtyDaysAgo)
        .order("deleted_at", { ascending: false }),
      supabase
        .from("sprints")
        .select("id, project_id, status")
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null),
      supabase
        .from("sprint_tasks")
        .select("id, sprint_id, status")
        .eq("workspace_id", workspace.id),
      supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspace.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const isAdmin = workspace.owner_id === user.id || member?.role === "pm";

  // Build sprint count per project
  const sprintsByProject = new Map<string, number>();
  sprints?.forEach((s) => {
    if (s.project_id) {
      sprintsByProject.set(s.project_id, (sprintsByProject.get(s.project_id) || 0) + 1);
    }
  });

  // Build sprint -> project lookup for task counting
  const sprintToProject = new Map<string, string>();
  sprints?.forEach((s) => {
    if (s.project_id) sprintToProject.set(s.id, s.project_id);
  });

  const tasksByProject = new Map<string, { total: number; completed: number }>();
  sprintTasks?.forEach((task) => {
    const projectId = sprintToProject.get(task.sprint_id);
    if (!projectId) return;
    const cur = tasksByProject.get(projectId) || { total: 0, completed: 0 };
    tasksByProject.set(projectId, {
      total: cur.total + 1,
      completed: cur.completed + (task.status === "done" || task.status === "completed" ? 1 : 0),
    });
  });

  // Enrich projects with computed fields
  const enrichedProjects = (projects || []).map((p) => {
    const milestones: any[] = p.ai_data?.milestones || [];
    const completedMilestones = milestones.filter((m: any) => m.status === "completed").length;
    const tasks = tasksByProject.get(p.id) || { total: 0, completed: 0 };

    return {
      ...p,
      sprintCount: sprintsByProject.get(p.id) || 0,
      taskCount: tasks.total,
      completedTaskCount: tasks.completed,
      milestoneCount: milestones.length,
      completedMilestoneCount: completedMilestones,
      milestoneProgress:
        milestones.length > 0
          ? Math.round((completedMilestones / milestones.length) * 100)
          : null,
    };
  });

  const total = enrichedProjects.length;
  const active = enrichedProjects.filter(
    (p) => p.status === "active" || (!p.status && p.ai_status === "completed")
  ).length;
  const completed = enrichedProjects.filter((p) => p.status === "completed").length;
  const pending = enrichedProjects.filter(
    (p) => p.status === "pending" || p.status === "planning" || (!p.status && p.ai_status !== "completed")
  ).length;

  return (
    <ProjectsClient
      projects={enrichedProjects}
      deletedProjects={(deletedProjects || []) as any[]}
      workspace={workspace}
      isAdmin={!!isAdmin}
      stats={{ total, active, completed, pending }}
    />
  );
}
