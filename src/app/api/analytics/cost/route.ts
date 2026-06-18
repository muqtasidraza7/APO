import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, ai_data, workspace_id, created_at")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const budgetEstimate = project.ai_data?.budget_estimate || 0;
    const currency = project.ai_data?.currency || "USD";
    const timelineWeeks = project.ai_data?.timeline_weeks || 12;

    const daysSinceStart = project.created_at
      ? (Date.now() - new Date(project.created_at).getTime()) / 864e5
      : 0;
    const currentWeek = Math.max(1, Math.min(timelineWeeks, Math.ceil(daysSinceStart / 7) || 1));

    const aiMilestones: any[] = project.ai_data?.milestones || [];
    const totalMilestones = aiMilestones.length;
    const completedMilestones = aiMilestones.filter((m: any) => m.status === "completed").length;

    const [
      { data: assignments },
      { data: sprintTasks },
      { data: teamMembers },
      { data: expenses },
      { data: budgetLog },
    ] = await Promise.all([
      admin
        .from("project_assignments")
        .select("id, task_name, week_number, status, resource_id")
        .eq("project_id", projectId),
      admin
        .from("sprint_tasks")
        .select("id, assigned_to, status, time_estimate_hours, actual_hours, parent_milestone_id")
        .eq("project_id", projectId),
      admin
        .from("team_members")
        .select("id, full_name, job_title, hourly_rate, capacity_hours_per_week")
        .eq("workspace_id", project.workspace_id),
      admin
        .from("project_expenses")
        .select("id, category, description, amount, expense_date, created_at")
        .eq("project_id", projectId)
        .order("expense_date", { ascending: false }),
      admin
        .from("budget_change_log")
        .select("old_value, new_value, changed_by_name, note, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const memberMap: Record<string, any> = {};
    for (const m of teamMembers || []) memberMap[m.id] = m;

    // ── Reconcile project_assignments with ai_data ─────────────────────────────
    // ai_data.milestones[].assigned_member_ids is always synced after every allocation
    // change, making it the canonical source for current member assignments.
    // Filter out stale project_assignment rows (e.g., from failed case-sensitive deletes).
    const aiAssignedSet = new Set<string>(); // "memberId::normTitle"
    const aiCoveredMs  = new Set<string>(); // normTitle (milestones tracked in ai_data)
    for (const ms of aiMilestones) {
      const memberIds: string[] = ms.assigned_member_ids || [];
      if (memberIds.length === 0) continue;
      aiCoveredMs.add(norm(ms.title));
      for (const mid of memberIds) aiAssignedSet.add(`${mid}::${norm(ms.title)}`);
    }
    const reconciledAssignments = (assignments || []).filter((a: any) => {
      const nt = norm(a.task_name);
      if (!aiCoveredMs.has(nt)) return true; // Not in ai_data — keep
      return aiAssignedSet.has(`${a.resource_id}::${nt}`);
    });

    // ── Estimated cost from allocations ──────────────────────────────────────────
    let totalCalculatedCost = 0;
    let totalEstimatedHours = 0;
    const costByWeek: Record<number, number> = {};
    const costByMember: Record<string, { name: string; cost: number; hours: number }> = {};

    function addEstCost(memberId: string, cost: number, hours: number, week: number | null) {
      totalCalculatedCost += cost;
      totalEstimatedHours += hours;
      if (week && week > 0) costByWeek[week] = (costByWeek[week] || 0) + cost;
      const member = memberMap[memberId];
      if (member) {
        if (!costByMember[memberId]) {
          costByMember[memberId] = { name: member.full_name || member.job_title || "Team Member", cost: 0, hours: 0 };
        }
        costByMember[memberId].cost += cost;
        costByMember[memberId].hours += hours;
      }
    }

    const coveredTitles = new Set<string>();
    for (const a of reconciledAssignments) {
      const member = memberMap[a.resource_id];
      const rate = member?.hourly_rate || 50;
      const hrs = 20;
      addEstCost(a.resource_id, rate * hrs, hrs, a.week_number);
      coveredTitles.add(norm(a.task_name));
    }

    for (const ms of aiMilestones) {
      if (!ms.assigned_member_ids?.length) continue;
      if (coveredTitles.has(norm(ms.title))) continue;
      const msWeek = ms.week || 0;
      for (const memberId of ms.assigned_member_ids as string[]) {
        const member = memberMap[memberId];
        if (!member) continue;
        const rate = member.hourly_rate || 50;
        addEstCost(memberId, rate * 20, 20, msWeek);
      }
      coveredTitles.add(norm(ms.title));
    }

    if (totalCalculatedCost === 0) {
      for (const task of sprintTasks || []) {
        const hrs = Number(task.time_estimate_hours) || 0;
        if (hrs === 0 || !task.assigned_to) continue;
        const member = memberMap[task.assigned_to];
        const rate = member?.hourly_rate || 50;
        addEstCost(task.assigned_to, rate * hrs, hrs, null);
      }
    }

    // ── Actual cost from logged hours on sprint tasks ─────────────────────────
    let actualHoursWorked = 0;
    let actualPersonnelCost = 0;

    for (const task of sprintTasks || []) {
      const estHrs = Number(task.time_estimate_hours) || 0;
      const actHrs = task.actual_hours != null ? Number(task.actual_hours) : null;

      // For "hours worked" metric, use actual if logged, else count done tasks' estimates
      if (actHrs !== null) {
        actualHoursWorked += actHrs;
        const member = task.assigned_to ? memberMap[task.assigned_to] : null;
        const rate = member?.hourly_rate || 50;
        actualPersonnelCost += actHrs * rate;
      } else if (task.status === "done") {
        actualHoursWorked += estHrs;
        const member = task.assigned_to ? memberMap[task.assigned_to] : null;
        const rate = member?.hourly_rate || 50;
        actualPersonnelCost += estHrs * rate;
      }
    }

    // ── Expenses ──────────────────────────────────────────────────────────────
    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    const actualSpentCost = Math.round(actualPersonnelCost + totalExpenses);

    // ── Milestone variance ─────────────────────────────────────────────────────
    // Group sprint tasks by parent_milestone_id (title string)
    const milestoneTaskMap: Record<string, { estHours: number; actualHours: number; hasSome: boolean; memberId?: string }> = {};
    for (const task of sprintTasks || []) {
      const key = task.parent_milestone_id;
      if (!key) continue;
      if (!milestoneTaskMap[key]) milestoneTaskMap[key] = { estHours: 0, actualHours: 0, hasSome: false };
      milestoneTaskMap[key].estHours += Number(task.time_estimate_hours) || 0;
      if (task.actual_hours != null) {
        milestoneTaskMap[key].actualHours += Number(task.actual_hours);
        milestoneTaskMap[key].hasSome = true;
      } else if (task.status === "done") {
        milestoneTaskMap[key].actualHours += Number(task.time_estimate_hours) || 0;
        milestoneTaskMap[key].hasSome = true;
      }
      if (!milestoneTaskMap[key].memberId && task.assigned_to) {
        milestoneTaskMap[key].memberId = task.assigned_to;
      }
    }

    const milestoneVariance = aiMilestones.map((ms: any) => {
      const title = ms.title || ms.task_name || "";
      const td = milestoneTaskMap[title] || { estHours: 0, actualHours: 0, hasSome: false };
      // Fall back to 20h estimate from allocations if no tasks
      const estHours = td.estHours > 0 ? td.estHours : (coveredTitles.has(norm(title)) ? 20 : 0);

      // Get a representative hourly rate from assigned members
      const assignedIds: string[] = ms.assigned_member_ids || [];
      const rate = assignedIds.length > 0 && memberMap[assignedIds[0]]
        ? (memberMap[assignedIds[0]].hourly_rate || 50)
        : 50;

      const estCost = Math.round(estHours * rate);
      const actualCost = td.hasSome ? Math.round(td.actualHours * rate) : null;
      const actualHours = td.hasSome ? td.actualHours : null;

      const assignedMembers = assignedIds
        .map((id: string) => memberMap[id]?.full_name || memberMap[id]?.job_title || null)
        .filter(Boolean) as string[];

      return {
        title,
        week: ms.week || ms.week_number || 0,
        status: ms.status || "pending",
        estHours,
        actualHours,
        estCost,
        actualCost,
        variance: actualCost !== null ? actualCost - estCost : null,
        assignedMembers,
      };
    }).filter((m: any) => m.title && m.estHours > 0);

    const weeklyBurnChart = Object.keys(costByWeek)
      .map((week) => ({ week: parseInt(week), cost: Math.round(costByWeek[parseInt(week)]) }))
      .sort((a, b) => a.week - b.week);

    const resourceCostChart = Object.values(costByMember)
      .map(r => ({ ...r, cost: Math.round(r.cost) }))
      .sort((a, b) => b.cost - a.cost);

    return NextResponse.json({
      budgetEstimate,
      currency,
      workspaceId: project.workspace_id,
      timelineWeeks,
      currentWeek,
      daysSinceStart: Math.round(daysSinceStart),
      totalMilestones,
      completedMilestones,
      actualHoursWorked: Math.round(actualHoursWorked * 10) / 10,
      totalEstimatedHours,
      totalCalculatedCost: Math.round(totalCalculatedCost),
      actualSpentCost,
      totalExpenses: Math.round(totalExpenses),
      variance: budgetEstimate - totalCalculatedCost,
      weeklyBurnChart,
      resourceCostChart,
      milestoneVariance,
      expenses: expenses ?? [],
      budgetLog: budgetLog ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
