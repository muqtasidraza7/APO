import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });

    const admin = createAdminClient();

    const { data: sprints, error: sprintsErr } = await admin
      .from("sprints")
      .select("id, name, start_date, end_date, status, workspace_id, retrospective_notes")
      .eq("project_id", projectId)
      .order("start_date", { ascending: true });

    if (sprintsErr) throw sprintsErr;

    const empty = {
      sprintVelocity: [],
      memberVelocity: [],
      avgVelocity: 0,
      totalRemainingHours: 0,
      predictedSprintsToComplete: null,
      velocityTrend: "insufficient_data",
      completedSprintCount: 0,
    };
    if (!sprints?.length) return NextResponse.json(empty);

    const workspaceId = sprints[0].workspace_id;

    const [{ data: allTasks }, { data: members }] = await Promise.all([
      admin
        .from("sprint_tasks")
        .select("id, sprint_id, status, time_estimate_hours, actual_hours, assigned_to, completed_at")
        .eq("project_id", projectId),
      admin
        .from("team_members")
        .select("id, full_name, job_title")
        .eq("workspace_id", workspaceId),
    ]);

    const memberMap: Record<string, any> = {};
    for (const m of members || []) memberMap[m.id] = m;

    const tasksBySprint: Record<string, any[]> = {};
    for (const t of allTasks || []) {
      if (!tasksBySprint[t.sprint_id]) tasksBySprint[t.sprint_id] = [];
      tasksBySprint[t.sprint_id].push(t);
    }

    // Per-member accumulator (completed sprints only)
    const memberAcc: Record<string, {
      assigned: number; completed: number;
      estHours: number; actualHours: number; hasActual: boolean; sprintCount: number;
    }> = {};

    const sprintVelocity = sprints.map(sprint => {
      const tasks = tasksBySprint[sprint.id] || [];
      const doneTasks = tasks.filter(t => t.status === "done");
      const totalTasks = tasks.length;
      const completedTasks = doneTasks.length;
      const estimatedHours = tasks.reduce((s, t) => s + (Number(t.time_estimate_hours) || 0), 0);
      const completedEstHours = doneTasks.reduce((s, t) => s + (Number(t.time_estimate_hours) || 0), 0);
      const hasActualLogged = tasks.some(t => t.actual_hours != null);
      const actualHours = hasActualLogged
        ? Math.round(tasks.reduce((s, t) => s + (Number(t.actual_hours) || 0), 0) * 10) / 10
        : null;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const start = new Date(sprint.start_date);
      const end = new Date(sprint.end_date);
      const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));

      // Accumulate member stats for completed sprints
      if (sprint.status === "completed") {
        const seen = new Set<string>();
        for (const task of tasks) {
          const mid = task.assigned_to;
          if (!mid) continue;
          if (!memberAcc[mid]) memberAcc[mid] = { assigned: 0, completed: 0, estHours: 0, actualHours: 0, hasActual: false, sprintCount: 0 };
          memberAcc[mid].assigned++;
          if (task.status === "done") memberAcc[mid].completed++;
          memberAcc[mid].estHours += Number(task.time_estimate_hours) || 0;
          if (task.actual_hours != null) {
            memberAcc[mid].actualHours += Number(task.actual_hours);
            memberAcc[mid].hasActual = true;
          }
          seen.add(mid);
        }
        for (const mid of seen) memberAcc[mid].sprintCount++;
      }

      return {
        sprintId: sprint.id,
        sprintName: sprint.name,
        startDate: sprint.start_date,
        endDate: sprint.end_date,
        status: sprint.status,
        totalTasks,
        completedTasks,
        completionRate,
        estimatedHours,
        completedEstHours,
        actualHours,
        durationDays,
        retroNotes: sprint.retrospective_notes || null,
      };
    });

    // Velocity metrics
    const completedSprints = sprintVelocity.filter(s => s.status === "completed");
    const completedSprintCount = completedSprints.length;
    const avgVelocity = completedSprintCount > 0
      ? Math.round(completedSprints.reduce((s, sp) => s + sp.completedEstHours, 0) / completedSprintCount)
      : 0;

    // Trend: compare latest half vs earliest half of completed sprints
    let velocityTrend: "improving" | "declining" | "stable" | "insufficient_data" = "insufficient_data";
    if (completedSprintCount >= 4) {
      const half = Math.floor(completedSprintCount / 2);
      const earlyAvg = completedSprints.slice(0, half).reduce((s, sp) => s + sp.completedEstHours, 0) / half;
      const recentAvg = completedSprints.slice(-half).reduce((s, sp) => s + sp.completedEstHours, 0) / half;
      const changePct = earlyAvg > 0 ? ((recentAvg - earlyAvg) / earlyAvg) * 100 : 0;
      velocityTrend = changePct > 10 ? "improving" : changePct < -10 ? "declining" : "stable";
    } else if (completedSprintCount >= 2) {
      const first = completedSprints[0].completedEstHours;
      const last = completedSprints[completedSprintCount - 1].completedEstHours;
      const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
      velocityTrend = changePct > 10 ? "improving" : changePct < -10 ? "declining" : "stable";
    } else if (completedSprintCount === 1) {
      velocityTrend = "stable";
    }

    // Remaining work in planning/active sprints
    const remainingTasks = (allTasks || []).filter(t => {
      const sprint = sprints.find(s => s.id === t.sprint_id);
      return sprint && sprint.status !== "completed" && t.status !== "done";
    });
    const totalRemainingHours = remainingTasks.reduce((s, t) => s + (Number(t.time_estimate_hours) || 0), 0);
    const predictedSprintsToComplete = avgVelocity > 0
      ? Math.ceil(totalRemainingHours / avgVelocity)
      : null;

    // Per-member table
    const memberVelocity = Object.entries(memberAcc).map(([memberId, acc]) => {
      const m = memberMap[memberId];
      return {
        memberId,
        name: m?.full_name || m?.job_title || "Unknown",
        role: m?.job_title || "",
        totalAssigned: acc.assigned,
        totalCompleted: acc.completed,
        completionRate: acc.assigned > 0 ? Math.round((acc.completed / acc.assigned) * 100) : 0,
        totalEstHours: acc.estHours,
        totalActualHours: acc.hasActual ? Math.round(acc.actualHours * 10) / 10 : null,
        avgHoursPerSprint: acc.sprintCount > 0 ? Math.round(acc.estHours / acc.sprintCount) : 0,
        sprintCount: acc.sprintCount,
      };
    }).sort((a, b) => b.totalCompleted - a.totalCompleted);

    return NextResponse.json({
      sprintVelocity,
      memberVelocity,
      avgVelocity,
      totalRemainingHours,
      predictedSprintsToComplete,
      velocityTrend,
      completedSprintCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
