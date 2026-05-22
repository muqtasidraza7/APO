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

  const [
    { data: membersRaw, error: membersError },
    { data: projects },
    { data: sprints },
    { data: sprintTasks },
    { data: patterns },
    { data: wsMembers },
    { data: teamActivityRows },
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
    admin.from("team_activity")
      .select("team_member_id, metadata")
      .eq("workspace_id", workspaceId)
      .eq("activity_type", "task_assigned"),
  ]);

  if (membersError) {
    console.error("team_members query failed:", membersError);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const expByUserId: Record<string, { experience_level: string | null; years_of_experience: number | null }> = {};
  for (const wm of wsMembers || []) {
    if (wm.user_id) expByUserId[wm.user_id] = {
      experience_level: wm.experience_level || null,
      years_of_experience: wm.years_of_experience ?? null,
    };
  }

  let members = (membersRaw || []).map((m: any) => {
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

  // Deduplicate by user_id: keep first occurrence as canonical, remap duplicate IDs
  const idRemap = new Map<string, string>(); // duplicateId → canonicalId
  {
    const seenByUserId = new Map<string, string>();
    members = members.filter((m: any) => {
      if (!m.user_id) return true;
      const canon = seenByUserId.get(m.user_id);
      if (!canon) { seenByUserId.set(m.user_id, m.id); return true; }
      idRemap.set(m.id, canon);
      return false;
    });
  }

  const projectIds = (projects || []).map((p) => p.id);

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
        estimated_hours: 0,
      }));
    } else {
      assignments = (aData || []).map((a: any) => ({ ...a, estimated_hours: 0 }));
    }
  }

  // Remap any duplicate member IDs to the canonical ID
  if (idRemap.size > 0) {
    for (const a of assignments) {
      const canonical = idRemap.get(a.resource_id);
      if (canonical) a.resource_id = canonical;
    }
  }

  // Reconcile with ai_data: syncAssignmentsToAiData is always called after every manual
  // update, so ai_data.milestones[].assigned_member_ids is the canonical source of truth
  // for who is currently assigned to each milestone. Filter out project_assignments rows
  // where the milestone exists in ai_data but the member is no longer listed (stale rows
  // that survived because the case-sensitive delete in updateMilestoneMembers missed them).
  const aiAssignedSet = new Set<string>(); // "canonicalMemberId::projectId::normTitle"
  const aiCoveredMs  = new Set<string>(); // "projectId::normTitle" (milestones tracked in ai_data)
  for (const p of projects || []) {
    for (const ms of (p.ai_data?.milestones || []) as any[]) {
      const memberIds: string[] = ms.assigned_member_ids || [];
      if (memberIds.length === 0) continue;
      const msKey = `${p.id}::${norm(ms.title)}`;
      aiCoveredMs.add(msKey);
      for (const mid of memberIds) {
        const canonical = idRemap.get(mid) ?? mid;
        aiAssignedSet.add(`${canonical}::${p.id}::${norm(ms.title)}`);
      }
    }
  }
  assignments = assignments.filter((a: any) => {
    const msKey = `${a.project_id}::${norm(a.task_name)}`;
    if (!aiCoveredMs.has(msKey)) return true; // Not tracked in ai_data — keep
    return aiAssignedSet.has(`${a.resource_id}::${a.project_id}::${norm(a.task_name)}`);
  });

  // Synthesize assignments from ai_data.milestones[].assigned_member_ids
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
            estimated_hours: ms.estimated_hours || 0,
          });
        }
      }
    }
  }

  // Build a set of (project_id, normalized_task_name) pairs already covered by
  // authoritative sources (project_assignments + ai_data). This prevents stale
  // team_activity rows from ghosting milestones that were reassigned to someone else.
  const authoritativePairs = new Set<string>(
    assignments.map((a: any) => `${a.project_id}::${norm(a.task_name)}`)
  );

  // Synthesize from team_activity
  const projectByName = new Map((projects || []).map((p) => [norm(p.name), p.id]));
  const memberIdByTmId = new Map(members.map((m: any) => [m.id, m.id]));
  for (const row of teamActivityRows || []) {
    const meta = row.metadata || {};
    if (meta.status === "removed") continue;
    const tmId = row.team_member_id;
    if (!memberIdByTmId.has(tmId)) continue;
    const taskTitle = meta.task_title;
    const projectId = meta.project_id || projectByName.get(norm(meta.project_name || ""));
    if (!taskTitle || !projectId) continue;
    // Skip if this (project, milestone) pair is already covered by project_assignments or ai_data —
    // the team_activity row may be stale from a previous assignment.
    if (authoritativePairs.has(`${projectId}::${norm(taskTitle)}`)) continue;
    const alreadyIn = assignments.find(
      (a: any) => a.resource_id === tmId && a.project_id === projectId && norm(a.task_name) === norm(taskTitle)
    );
    if (alreadyIn) {
      if (!alreadyIn.estimated_hours && meta.estimated_hours) {
        alreadyIn.estimated_hours = meta.estimated_hours;
      }
    } else {
      assignments.push({
        resource_id: tmId,
        project_id: projectId,
        task_name: taskTitle,
        manually_completed: false,
        manually_completed_at: null,
        estimated_hours: meta.estimated_hours || 0,
      });
    }
  }

  // ── Lookup maps ──────────────────────────────────────────────────────────────
  const projectMap = new Map((projects || []).map((p) => [p.id, p]));

  // Sprint lookup by ID — used for accurate active/deferred classification
  const sprintById = new Map((sprints || []).map((s) => [s.id, s]));

  // Project start = earliest sprint start_date, fallback to created_at
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

  // Sprint tasks grouped by "memberId::projectId::normalizedMilestoneTitle"
  // Only include tasks from non-deleted sprints (sprints query already filters deleted_at = null)
  const activeSprintIds = new Set((sprints || []).map((s: any) => s.id));
  const taskLookup = new Map<string, typeof sprintTasks>();
  for (const t of sprintTasks || []) {
    if (!t.assigned_to || !t.project_id || !t.parent_milestone_id) continue;
    if (t.sprint_id && !activeSprintIds.has(t.sprint_id)) continue;
    const key = `${t.assigned_to}::${t.project_id}::${norm(t.parent_milestone_id)}`;
    if (!taskLookup.has(key)) taskLookup.set(key, []);
    taskLookup.get(key)!.push(t);
  }

  const assignmentsByMember = new Map<string, typeof assignments>();
  for (const a of assignments || []) {
    if (!assignmentsByMember.has(a.resource_id)) assignmentsByMember.set(a.resource_id, []);
    assignmentsByMember.get(a.resource_id)!.push(a);
  }

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

  // ── Build rich member data ───────────────────────────────────────────────────
  const result = (members || []).map((member) => {
    const memberAssignments = assignmentsByMember.get(member.id) || [];

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

        // Milestone deadline based on project start + week offset
        const deadline = new Date(projectStart.getTime() + week * 7 * 24 * 60 * 60 * 1000);

        // Sprint tasks for this member / project / milestone
        const key = `${member.id}::${projectId}::${normTitle}`;
        const tasks = taskLookup.get(key) || [];
        const doneTasks = tasks.filter((t: any) => t.status === "done");
        const nonDoneTasks = tasks.filter((t: any) => t.status !== "done");

        const autoCompleted = tasks.length > 0 && doneTasks.length === tasks.length;
        const manuallyCompleted = !!assignment.manually_completed;
        const isDone = autoCompleted || manuallyCompleted;

        let remainingHours = 0;
        let effectivePhase: "active" | "deferred" | "overdue";

        if (tasks.length > 0) {
          // Active load = sum of time estimates of incomplete sprint tasks
          remainingHours = nonDoneTasks.reduce(
            (s: number, t: any) => s + (t.time_estimate_hours || 0),
            0
          );

          // Classify by the nearest sprint end date among incomplete tasks.
          // This is more accurate than milestone deadlines because it respects
          // the actual sprint schedule the PM has set up.
          const sprintEndTimes = nonDoneTasks
            .map((t: any) => {
              const sprint = t.sprint_id ? sprintById.get(t.sprint_id) : null;
              return sprint?.end_date ? new Date(sprint.end_date).getTime() : null;
            })
            .filter((d): d is number => d !== null);

          if (sprintEndTimes.length > 0) {
            const nearestEnd = new Date(Math.min(...sprintEndTimes));
            effectivePhase = nearestEnd < TODAY
              ? "overdue"
              : nearestEnd <= WINDOW_END
                ? "active"
                : "deferred";
          } else {
            // No sprint info on tasks — fall back to milestone deadline
            effectivePhase = deadline < TODAY ? "overdue" : deadline <= WINDOW_END ? "active" : "deferred";
          }
        } else {
          // No sprint tasks created yet — classify by milestone deadline
          effectivePhase = deadline < TODAY ? "overdue" : deadline <= WINDOW_END ? "active" : "deferred";
          // Use estimated hours from ai_data or from the assignment record
          remainingHours =
            (aiMs?.estimated_hours as number | undefined) ||
            assignment.estimated_hours ||
            0;
        }

        if (!isDone) {
          if (effectivePhase === "active" || effectivePhase === "overdue") {
            activeHours += remainingHours;
          } else {
            deferredHours += remainingHours;
          }
        }

        msTotal++;
        if (isDone) msDone++;
        stTotal += tasks.length;
        stDone += doneTasks.length;

        return {
          title: assignment.task_name,
          week,
          deadline: deadline.toISOString(),
          phase: isDone ? ("done" as const) : effectivePhase,
          is_done: isDone,
          actual_status: aiMs?.status || "pending",
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
    const utilizationPct = capacityMonthly > 0
      ? Math.round((activeHours / capacityMonthly) * 100)
      : 0;

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
