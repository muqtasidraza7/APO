import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import { getGroqModel } from "../../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

// ── Scoring helpers ────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function scoreStatus(s: number): "good" | "warn" | "bad" {
  return s >= 70 ? "good" : s >= 45 ? "warn" : "bad";
}

// ── POST /api/projects/health ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const admin = createAdminClient();

    // ── Fetch all signals in parallel ─────────────────────────────────────────
    const [
      { data: project },
      { data: sprints },
      { data: allTasks },
    ] = await Promise.all([
      admin.from("projects")
        .select("name, created_at, ai_data, status")
        .eq("id", projectId)
        .single(),
      admin.from("sprints")
        .select("id, name, start_date, end_date, status, milestone_ids")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("start_date"),
      admin.from("sprint_tasks")
        .select("sprint_id, status")
        .eq("project_id", projectId),
    ]);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // ── Raw signals ────────────────────────────────────────────────────────────
    const rawMilestones: any[] = project.ai_data?.milestones || [];
    const totalWeeks: number = project.ai_data?.timeline_weeks || 12;

    // De-duplicate milestones by title
    const seen = new Set<string>();
    const milestones = rawMilestones.filter((ms) => {
      if (!ms.title || seen.has(ms.title)) return false;
      seen.add(ms.title);
      return true;
    });

    const totalMs = milestones.length;
    const completedMs = milestones.filter((ms) => ms.status === "completed").length;

    // Current week in project
    const projectStart = new Date(project.created_at);
    const daysSince = (Date.now() - projectStart.getTime()) / 86_400_000;
    const currentWeek = Math.max(1, Math.min(totalWeeks, Math.ceil(daysSince / 7)));

    // Tasks across all sprints
    const tasksBySprint = new Map<string, { total: number; done: number }>();
    for (const t of allTasks || []) {
      const cur = tasksBySprint.get(t.sprint_id) ?? { total: 0, done: 0 };
      tasksBySprint.set(t.sprint_id, {
        total: cur.total + 1,
        done: cur.done + (t.status === "done" ? 1 : 0),
      });
    }

    const totalTasks = (allTasks || []).length;
    const doneTasks = (allTasks || []).filter((t) => t.status === "done").length;

    const activeSprints = (sprints || []).filter((s) => s.status === "active");
    const completedSprints = (sprints || []).filter((s) => s.status === "completed");
    const planningSprints = (sprints || []).filter((s) => s.status === "planning");

    // ── Factor 1: Milestone completion (weight 25%) ────────────────────────────
    const milestoneScore = totalMs === 0
      ? 60
      : clamp(Math.round((completedMs / totalMs) * 100));

    // ── Factor 2: Timeline adherence (weight 25%) ─────────────────────────────
    // Compares task progress against time elapsed
    const timeProgress = clamp(Math.round((currentWeek / totalWeeks) * 100));
    const taskProgress = totalTasks === 0 ? 60 : clamp(Math.round((doneTasks / totalTasks) * 100));
    const timelineDeviation = taskProgress - timeProgress; // positive = ahead
    const timelineScore = totalTasks === 0 ? 60 : clamp(50 + Math.round(timelineDeviation * 1.2));

    // ── Factor 3: Sprint velocity (weight 25%) ─────────────────────────────────
    // Average completion rate across completed sprints
    const velocityRates = completedSprints
      .map((s) => {
        const st = tasksBySprint.get(s.id);
        return st && st.total > 0 ? (st.done / st.total) * 100 : null;
      })
      .filter((r): r is number => r !== null);

    const velocityScore = velocityRates.length === 0
      ? (activeSprints.length > 0 ? 65 : 50)
      : clamp(Math.round(velocityRates.reduce((a, b) => a + b, 0) / velocityRates.length));

    const velocityTrend: "up" | "stable" | "down" | "none" =
      velocityRates.length < 2 ? "none"
      : velocityRates[velocityRates.length - 1] > velocityRates[0] ? "up"
      : velocityRates[velocityRates.length - 1] < velocityRates[0] - 10 ? "down"
      : "stable";

    // ── Factor 4: Overdue risk (weight 15%) ───────────────────────────────────
    const overdueMs = milestones.filter(
      (ms) => (ms.week ?? 0) < currentWeek && ms.status !== "completed"
    ).length;
    const overdueScore = clamp(100 - Math.round((overdueMs / Math.max(1, totalMs)) * 100 * 2.5));

    // ── Factor 5: Sprint coverage of upcoming milestones (weight 10%) ─────────
    const upcomingMs = milestones.filter((ms) => (ms.week ?? 0) > currentWeek);
    const allSprintMilestoneTitles = new Set(
      (sprints || []).flatMap((s) => (s.milestone_ids || []).map((t: string) => t.trim().toLowerCase()))
    );
    const coveredUpcoming = upcomingMs.filter((ms) =>
      allSprintMilestoneTitles.has(ms.title.trim().toLowerCase())
    ).length;
    const coverageScore = upcomingMs.length === 0
      ? 100
      : clamp(Math.round((coveredUpcoming / upcomingMs.length) * 100));

    // ── Weighted total ─────────────────────────────────────────────────────────
    const healthScore = clamp(Math.round(
      milestoneScore * 0.25 +
      timelineScore  * 0.25 +
      velocityScore  * 0.25 +
      overdueScore   * 0.15 +
      coverageScore  * 0.10
    ));

    const status: "healthy" | "warning" | "critical" =
      healthScore >= 75 ? "healthy" : healthScore >= 50 ? "warning" : "critical";

    const factors = [
      {
        name: "Milestone Progress",
        score: milestoneScore,
        status: scoreStatus(milestoneScore),
        detail: totalMs === 0
          ? "No milestones yet"
          : `${completedMs} of ${totalMs} completed (${milestoneScore}%)`,
      },
      {
        name: "Timeline Adherence",
        score: timelineScore,
        status: scoreStatus(timelineScore),
        detail: totalTasks === 0
          ? "No tasks yet"
          : timelineDeviation >= 0
            ? `${Math.abs(timelineDeviation)}% ahead of schedule`
            : `${Math.abs(timelineDeviation)}% behind schedule`,
      },
      {
        name: "Sprint Velocity",
        score: velocityScore,
        status: scoreStatus(velocityScore),
        detail: velocityRates.length === 0
          ? activeSprints.length > 0 ? "Sprint in progress — no history yet" : "No completed sprints yet"
          : `Avg ${Math.round(velocityScore)}% across ${velocityRates.length} sprint${velocityRates.length !== 1 ? "s" : ""}`,
      },
      {
        name: "Overdue Risk",
        score: overdueScore,
        status: scoreStatus(overdueScore),
        detail: overdueMs === 0
          ? "No overdue milestones"
          : `${overdueMs} overdue milestone${overdueMs !== 1 ? "s" : ""} not yet complete`,
      },
      {
        name: "Sprint Coverage",
        score: coverageScore,
        status: scoreStatus(coverageScore),
        detail: upcomingMs.length === 0
          ? "No upcoming milestones"
          : `${coveredUpcoming} of ${upcomingMs.length} upcoming milestones have sprints`,
      },
    ];

    // ── AI narrative (Groq) ────────────────────────────────────────────────────
    let narrative = "";
    try {
      const model = getGroqModel(0.3);
      const parser = new StringOutputParser();

      const promptTemplate = PromptTemplate.fromTemplate(
        `You are a senior project health analyst. Write exactly 2 sentences summarising the health of project "{projectName}".

Health score: {score}/100 ({status})
Week {currentWeek} of {totalWeeks}

Signals:
- Milestones: {completedMs}/{totalMs} complete, {overdueMs} overdue
- Tasks: {doneTasks}/{totalTasks} done — {timelineDetail}
- Sprint velocity: {velocityDetail}
- Active sprints: {activeSprints}, Planning: {planningSprints}
- Upcoming milestone coverage: {coverageDetail}

Rules:
1. First sentence: overall health in plain language — cite one key number.
2. Second sentence: the single most important action the team should take right now.
3. Be specific and direct. No filler phrases like "it appears" or "it seems".
4. Maximum 40 words per sentence.`
      );

      const prompt = await promptTemplate.invoke({
        projectName: project.name,
        score: healthScore,
        status,
        currentWeek,
        totalWeeks,
        completedMs,
        totalMs,
        overdueMs,
        doneTasks,
        totalTasks,
        timelineDetail: factors[1].detail,
        velocityDetail: factors[2].detail,
        activeSprints: activeSprints.length,
        planningSprints: planningSprints.length,
        coverageDetail: factors[4].detail,
      });

      narrative = await model.pipe(parser).invoke(prompt);
    } catch (aiErr) {
      // Non-fatal — return score without narrative
      console.warn("Health narrative generation failed:", aiErr);
    }

    return NextResponse.json({
      score: healthScore,
      status,
      factors,
      narrative: narrative.trim(),
      signals: {
        milestoneCompletion: milestoneScore,
        overdueCount: overdueMs,
        velocityTrend,
        activeSprintCount: activeSprints.length,
        taskCompletionRate: taskProgress,
        timelineDeviation,
      },
      computedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Health API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
