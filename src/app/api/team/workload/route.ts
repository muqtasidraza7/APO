import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await request.json();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const admin = createAdminClient();

  // Fetch all base data in parallel
  const [
    { data: membersRaw, error: membersError },
    { data: projects },
    { data: sprints },
    { data: sprintTasks },
    { data: patterns },
    { data: wsMembers },
  ] = await Promise.all([
    admin.from("team_members")
      .select("id, full_name, job_title, status, capacity_hours_per_week, skills, user_id, performance_score")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    admin.from("projects")
      .select("id, name, created_at, ai_data")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    admin.from("sprints")
      .select("id, name, start_date, end_date, milestone_ids, project_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    admin.from("sprint_tasks")
      .select("id, title, assigned_to, status, time_estimate_hours, parent_milestone_id, project_id, sprint_id")
      .eq("workspace_id", workspaceId),
    admin.from("worker_patterns")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("resolved", false),
    admin.from("workspace_members")
      .select("user_id, experience_level, years_of_experience")
      .eq("workspace_id", workspaceId),
  ]);

  if (membersError) {
    console.error("team_members query failed:", membersError);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  // Build experience lookup keyed by user_id (from workspace_members)
  const expByUserId: Record<string, { experience_level: string | null; years_of_experience: number | null }> = {};
  for (const wm of wsMembers || []) {
    if (wm.user_id) expByUserId[wm.user_id] = {
      experience_level: wm.experience_level || null,
      years_of_experience: wm.years_of_experience ?? null,
    };
  }

  // Inject optional columns with defaults so callers don't need to handle undefined
  const members = (membersRaw || []).map((m: any) => {
    const exp = m.user_id ? (expByUserId[m.user_id] || {}) : {};
    return {
      performance_score: 100,
      avatar_url: null,
      experience_level: null,
      years_of_experience: null,
      ...m,
      ...exp,
    };
  });

  const projectIds = (projects || []).map((p) => p.id);

  // project_assignments has no workspace_id — query by project ids
  // Try with manually_completed columns; fall back to core columns if they don't exist yet
  let assignments: any[] = [];
  if (projectIds.length > 0) {
    const { data: aData, error: aErr } = await admin
      .from("project_assignments")
      .select("resource_id, project_id, task_name, manually_completed, manually_completed_at")
      .in("project_id", projectIds);

    if (aErr) {
      console.warn("project_assignments full select failed, falling back:", aErr.message);
      const { data: aBasic } = await admin
        .from("project_assignments")
        .select("resource_id, project_id, task_name")
        .in("project_id", projectIds);
      assignments = (aBasic || []).map((a: any) => ({
        ...a,
        manually_completed: false,
        manually_completed_at: null,
      }));
    } else {
      assignments = aData || [];
    }
  }

  // Also synthesize assignments from ai_data.milestones[].assigned_member_ids
  // (set by the MilestoneList UI — these don't create project_assignments rows)
  const memberIdSet = new Set(members.map((m: any) => m.id));
  for (const project of projects || []) {
    const aiMilestones: any[] = project.ai_data?.milestones || [];
    for (const ms of aiMilestones) {
      for (const memberId of (ms.assigned_member_ids || []) as string[]) {
        if (!memberIdSet.has(memberId)) continue;
        const alreadyIn = assignments.some(
          (a: any) =>
            a.resource_id === memberId &&
            a.project_id === project.id &&
            norm(a.task_name) === norm(ms.title)
        );
        if (!alreadyIn) {
          assignments.push({
            resource_id: memberId,
            project_id: project.id,
            task_name: ms.title,
            manually_completed: false,
            manually_completed_at: null,
          });
        }
      }
    }
  }

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const projectMap = new Map((projects || []).map((p) => [p.id, p]));

  // Project start = earliest sprint start_date for the project, else created_at
  const projectStartMap = new Map<string, Date>();
  for (const p of projects || []) {
    const dates = (sprints || [])
      .filter((s) => s.project_id === p.id)
      .map((s) => new Date(s.start_date).getTime());
    projectStartMap.set(
      p.id,
      new Date(dates.length > 0 ? Math.min(...dates) : new Date(p.created_at).getTime())
    );
  }

  // Sprint tasks keyed by "memberId::projectId::normalizedMilestoneTitle"
  const taskLookup = new Map<string, typeof sprintTasks>();
  for (const t of sprintTasks || []) {
    if (!t.assigned_to || !t.project_id || !t.parent_milestone_id) continue;
    const key = `${t.assigned_to}::${t.project_id}::${norm(t.parent_milestone_id)}`;
    if (!taskLookup.has(key)) taskLookup.set(key, []);
    taskLookup.get(key)!.push(t);
  }

  // Assignments grouped by member
  const assignmentsByMember = new Map<string, typeof assignments>();
  for (const a of assignments || []) {
    if (!assignmentsByMember.has(a.resource_id)) assignmentsByMember.set(a.resource_id, []);
    assignmentsByMember.get(a.resource_id)!.push(a);
  }

  // Patterns grouped by member
  const patternsByMember = new Map<string, any[]>();
  const addPattern = (memberId: string, p: any) => {
    if (!memberId) return;
    if (!patternsByMember.has(memberId)) patternsByMember.set(memberId, []);
    patternsByMember.get(memberId)!.push(p);
  };
  for (const p of patterns || []) {
    if (p.pattern_type === "task_incompatibility") addPattern(p.member_id, p);
    if (p.pattern_type === "group_conflict") { addPattern(p.member_id_a, p); addPattern(p.member_id_b, p); }
  }

  // Rolling window: today + 30 days
  const TODAY = new Date();
  const WINDOW_END = new Date(TODAY.getTime() + 30 * 24 * 60 * 60 * 1000);

  // ── Build rich member data ─────────────────────────────────────────────────
  const result = (members || []).map((member) => {
    const memberAssignments = assignmentsByMember.get(member.id) || [];

    // Group member assignments by project
    const byProject = new Map<string, typeof memberAssignments>();
    for (const a of memberAssignments) {
      if (!byProject.has(a.project_id)) byProject.set(a.project_id, []);
      byProject.get(a.project_id)!.push(a);
    }

    let activeHours = 0;
    let deferredHours = 0;
    let msTotal = 0;
    let msDone = 0;
    let stTotal = 0;
    let stDone = 0;

    const projectBreakdowns = Array.from(byProject.entries()).map(([projectId, projAssignments]) => {
      const project = projectMap.get(projectId);
      if (!project) return null;

      const projectStart = projectStartMap.get(projectId)!;
      const aiMilestones: any[] = project.ai_data?.milestones || [];

      const milestones = projAssignments.map((assignment) => {
        const normTitle = norm(assignment.task_name);
        const aiMs = aiMilestones.find((m: any) => norm(m.title) === normTitle);
        const week = aiMs?.week ?? aiMs?.week_number ?? 0;

        // Deadline = project start + week × 7 days
        const deadline = new Date(projectStart.getTime() + week * 7 * 24 * 60 * 60 * 1000);

        // Phase
        let phase: "active" | "deferred" | "overdue";
        if (deadline < TODAY) phase = "overdue";
        else if (deadline <= WINDOW_END) phase = "active";
        else phase = "deferred";

        // Sprint tasks for this member/project/milestone
        const key = `${member.id}::${projectId}::${normTitle}`;
        const tasks = taskLookup.get(key) || [];
        const doneTasks = tasks.filter((t: any) => t.status === "done");
        const autoCompleted = tasks.length > 0 && doneTasks.length === tasks.length;
        const manuallyCompleted = !!assignment.manually_completed;
        const isDone = autoCompleted || manuallyCompleted;

        const remainingHours = tasks
          .filter((t: any) => t.status !== "done")
          .reduce((s: number, t: any) => s + (t.time_estimate_hours || 0), 0);

        if (!isDone) {
          if (phase === "active" || phase === "overdue") activeHours += remainingHours;
          else deferredHours += remainingHours;
        }

        msTotal++;
        if (isDone) msDone++;
        stTotal += tasks.length;
        stDone += doneTasks.length;

        return {
          title: assignment.task_name,
          week,
          deadline: deadline.toISOString(),
          phase: isDone ? ("done" as const) : phase,
          is_done: isDone,
          auto_completed: autoCompleted,
          manually_completed: manuallyCompleted,
          sprint_tasks_total: tasks.length,
          sprint_tasks_done: doneTasks.length,
          active_hours: isDone ? 0 : remainingHours,
        };
      });

      return {
        project_id: projectId,
        project_name: project.name,
        milestones,
        sprint_tasks_active: milestones.reduce((s, m) => s + m.sprint_tasks_total - m.sprint_tasks_done, 0),
        sprint_tasks_done: milestones.reduce((s, m) => s + m.sprint_tasks_done, 0),
      };
    }).filter(Boolean);

    const capacityMonthly = (member.capacity_hours_per_week || 40) * 4;
    const utilizationPct = capacityMonthly > 0 ? Math.round((activeHours / capacityMonthly) * 100) : 0;

    return {
      ...member,
      patterns: patternsByMember.get(member.id) || [],
      projects: projectBreakdowns,
      load: {
        active_hours: Math.round(activeHours),
        deferred_hours: Math.round(deferredHours),
        capacity_monthly: capacityMonthly,
        utilization_pct: utilizationPct,
      },
      totals: {
        milestones_done: msDone,
        milestones_total: msTotal,
        sprint_tasks_done: stDone,
        sprint_tasks_total: stTotal,
      },
    };
  });

  return NextResponse.json({ members: result });
}
