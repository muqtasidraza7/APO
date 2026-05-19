import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import { getGroqModel } from "../../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

export const runtime = "nodejs";

const aiSprintTasksSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().describe("Short, actionable task title (max 10 words)"),
    description: z.string().describe("1-2 sentence description of what needs to be done"),
    effort_level: z.enum(["low", "medium", "high"]).describe("Effort required: low (1-3h), medium (4-8h), high (8-16+h)"),
    time_estimate_hours: z.number().int().describe("Estimated hours: 1-3 for low, 4-8 for medium, 8-16+ for high"),
    priority: z.enum(["high", "medium", "low"]),
    task_sequence: z.number().int().describe("Position in milestone flow (1-12)"),
    assigned_member_id: z.string().describe("The exact 'id' value from the TEAM list for the most suitable member. Must match one of the provided IDs exactly."),
  })),
});

// Helper: Parse sprint name to infer phase
function inferPhaseFromSprintName(name: string, existingTaskCount: number): { phase: number; phaseName: string } {
  const nameLower = name.toLowerCase();
  
  // Keywords for phases
  const phase1Keywords = ["foundation", "setup", "sprint 1", "sprint a", "base", "init"];
  const phase2Keywords = ["core", "sprint 2", "sprint b", "development", "implement", "dev"];
  const phase3Keywords = ["integration", "sprint 3", "sprint c", "polish", "testing", "test"];
  
  if (phase1Keywords.some(kw => nameLower.includes(kw))) {
    return { phase: 1, phaseName: "Foundation" };
  } else if (phase2Keywords.some(kw => nameLower.includes(kw))) {
    return { phase: 2, phaseName: "Core Development" };
  } else if (phase3Keywords.some(kw => nameLower.includes(kw))) {
    return { phase: 3, phaseName: "Integration & Testing" };
  }
  
  // Fallback: Infer from existing task count
  if (existingTaskCount === 0) {
    return { phase: 1, phaseName: "Foundation" };
  } else if (existingTaskCount <= 6) {
    return { phase: 2, phaseName: "Core Development" };
  } else {
    return { phase: 3, phaseName: "Integration & Testing" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sprintId, projectId, workspaceId } = await request.json();
    if (!sprintId || !projectId || !workspaceId) {
      return NextResponse.json({ error: "sprintId, projectId, workspaceId required" }, { status: 400 });
    }

    // Fetch sprint details
    const { data: sprint } = await supabase
      .from("sprints")
      .select("*")
      .eq("id", sprintId)
      .single();

    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

    // Check if sprint has milestone association
    const hasMilestones = sprint.milestone_ids && sprint.milestone_ids.length > 0;
    if (!hasMilestones) {
      return NextResponse.json({
        error: "This sprint is not associated with any milestone. Manual task creation is required. Use 'New Task' button to add tasks.",
      }, { status: 400 });
    }

    // Fetch project AI data (milestones, tasks)
    const { data: project } = await supabase
      .from("projects")
      .select("name, ai_data")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Use admin client to bypass RLS for team queries
    const admin = createAdminClient();

    // Fetch team members, project_assignments, behavioral patterns, and sprint history in parallel
    const [{ data: teamMembers }, { data: allAssignments }, { data: rawPatterns }, { data: allSprintTasks }, { data: allProjects }] = await Promise.all([
      admin
        .from("team_members")
        .select("id, full_name, job_title, skills, capacity_hours_per_week, performance_score")
        .eq("workspace_id", workspaceId),
      admin
        .from("project_assignments")
        .select("task_name, resource_id")
        .eq("project_id", projectId),
      admin
        .from("worker_patterns")
        .select("pattern_type, member_id, member_id_a, member_id_b, reason, severity")
        .eq("workspace_id", workspaceId)
        .eq("resolved", false)
        .in("pattern_type", ["group_conflict", "collaboration_positive", "task_incompatibility", "performance_insight"]),
      // Sprint task history for completion rate calculation
      admin
        .from("sprint_tasks")
        .select("assigned_to, status")
        .eq("workspace_id", workspaceId),
      // All projects for milestone completion tracking
      admin
        .from("projects")
        .select("ai_data")
        .eq("workspace_id", workspaceId),
    ]);

    // Compute sprint task completion rate per member
    const sprintStats: Record<string, { assigned: number; done: number }> = {};
    for (const task of allSprintTasks || []) {
      if (!task.assigned_to) continue;
      if (!sprintStats[task.assigned_to]) sprintStats[task.assigned_to] = { assigned: 0, done: 0 };
      sprintStats[task.assigned_to].assigned++;
      if (task.status === "done") sprintStats[task.assigned_to].done++;
    }

    // Compute milestone completion rate per member across all projects
    const msStats: Record<string, { total: number; completed: number }> = {};
    for (const p of allProjects || []) {
      for (const ms of (p.ai_data?.milestones || [])) {
        for (const memberId of (ms.assigned_member_ids || [])) {
          if (!msStats[memberId]) msStats[memberId] = { total: 0, completed: 0 };
          msStats[memberId].total++;
          if (ms.status === "completed") msStats[memberId].completed++;
        }
      }
    }

    const allMilestones = project.ai_data?.milestones || [];

    // Filter milestones to only those in sprint.milestone_ids
    const targetMilestones = allMilestones.filter((m: any) =>
      sprint.milestone_ids.some(
        (sid: string) => sid.trim().toLowerCase() === (m.title || "").trim().toLowerCase()
      )
    );

    if (targetMilestones.length === 0) {
      return NextResponse.json({
        error: "No matching milestones found for this sprint. Verify milestone names.",
      }, { status: 400 });
    }

    // Collect member IDs from BOTH sources:
    // 1. project_assignments (Team Allocation page) — primary
    // 2. ai_data.milestones[].assigned_member_ids — fallback
    const milestoneTeamIds = new Set<string>();
    const targetTitlesNorm = sprint.milestone_ids.map((t: string) => t.trim().toLowerCase());

    (allAssignments || []).forEach((a: any) => {
      if (targetTitlesNorm.includes((a.task_name || "").trim().toLowerCase())) {
        milestoneTeamIds.add(a.resource_id);
      }
    });
    targetMilestones.forEach((m: any) => {
      (m.assigned_member_ids || []).forEach((id: string) => milestoneTeamIds.add(id));
    });

    // Get existing tasks for same milestone(s) across all sprints
    const { data: existingMilestoneTasks } = await supabase
      .from("sprint_tasks")
      .select("title, description, priority, parent_milestone_id, task_sequence")
      .eq("project_id", projectId)
      .in("parent_milestone_id", sprint.milestone_ids);

    const existingTaskCount = existingMilestoneTasks?.length || 0;

    // Infer phase from sprint name and existing tasks
    const { phase, phaseName } = inferPhaseFromSprintName(sprint.name, existingTaskCount);

    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Filter to only milestone-assigned members (if any are assigned)
    const filteredTeamMembers = milestoneTeamIds.size > 0
      ? (teamMembers || []).filter((m: any) => milestoneTeamIds.has(m.id))
      : (teamMembers || []);

    if (filteredTeamMembers.length === 0) {
      return NextResponse.json({
        error: "No team members assigned to this milestone. Assign team members first.",
      }, { status: 400 });
    }

    const model = getGroqModel(0.4);
    const structuredModel = model.withStructuredOutput(aiSprintTasksSchema);

    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Agile Sprint Planner with deep understanding of project phases, team dynamics, and performance history.

PROJECT: "{projectName}"
SPRINT NAME: "{sprintName}"
SPRINT PHASE: Phase {phaseNum} — {phaseName}
SPRINT DURATION: {duration} days ({startDate} to {endDate})

TARGET MILESTONE(S):
{targetMilestones}

EXISTING TASKS FOR SAME MILESTONE(S) (from other sprints):
{existingTasks}

TEAM (with performance scores — higher is better, max 100):
{team}

BEHAVIORAL PATTERNS (from past sprint analysis):
{patterns}

SMART DISTRIBUTION RULES:
1. Phase {phaseNum} of the milestone should generate tasks that:
   - Build on Phase {phaseBefore} work (if applicable)
   - Set up for Phase {phaseAfter} work (if applicable)
   - Do NOT duplicate existing tasks
2. Assign task_sequence numbers starting from {nextSequence}
3. Generate 6-10 sprint tasks that:
   - Are achievable within {duration} days
   - Match the milestone goals
   - Have realistic effort levels (low: 1-3h, medium: 4-8h, high: 8-16+h)
   - Are specific and actionable
   - Cover a mix of high, medium, and low priorities
4. If Phase {phaseNum} is 1, focus on foundation/setup
   If Phase {phaseNum} is 2, focus on core features building on Phase 1
   If Phase {phaseNum} is 3, focus on integration/testing/hardening
5. For assigned_member_id: the TEAM list below contains ONLY members already assigned to this milestone.
   Pick the most suitable member for each task based on (in priority order):
   a. Skill match — match the task type to the member's role and skills (e.g., frontend tasks → React/UI skills, backend tasks → API/DB skills)
   b. Sprint completion rate — members with higher completion rates are more reliable; prefer them for high-priority tasks
   c. Milestone completion rate — members who deliver milestones successfully get priority for complex tasks
   d. Performance score — higher score means fewer behavioral issues (max 100)
   e. Behavioral patterns: PREFER pairs marked "✓ PREFER PAIRING"; AVOID members with "✗ AVOID" patterns for matching task types
   f. Distribute tasks across ALL team members — if 3 members are assigned to this milestone, all 3 should get tasks
   Use their exact "id" value.

IMPORTANT: Every task must have task_sequence and assigned_member_id (exact id from TEAM).
`);

    const phaseBefore = phase > 1 ? phase - 1 : null;
    const phaseAfter = phase < 3 ? phase + 1 : null;
    const nextSequence = existingTaskCount + 1;

    // Build member ID set for pattern filtering
    const filteredMemberIds = new Set(filteredTeamMembers.map((m: any) => m.id));

    // Filter patterns to only those relevant to this sprint's team
    const relevantPatterns = (rawPatterns || []).filter((p: any) => {
      if (p.member_id && filteredMemberIds.has(p.member_id)) return true;
      if (p.member_id_a && filteredMemberIds.has(p.member_id_a)) return true;
      if (p.member_id_b && filteredMemberIds.has(p.member_id_b)) return true;
      return false;
    });

    // Build member name map for pattern display
    const memberNameMap: Record<string, string> = {};
    for (const m of filteredTeamMembers) {
      memberNameMap[m.id] = m.full_name || m.job_title || m.id;
    }

    const patternsText = relevantPatterns.length > 0
      ? relevantPatterns.map((p: any) => {
          if (p.pattern_type === "collaboration_positive") {
            return `  ✓ PREFER PAIRING: ${memberNameMap[p.member_id_a] || p.member_id_a} + ${memberNameMap[p.member_id_b] || p.member_id_b} — ${p.reason}`;
          } else if (p.pattern_type === "group_conflict") {
            return `  ✗ AVOID PAIRING: ${memberNameMap[p.member_id_a] || p.member_id_a} + ${memberNameMap[p.member_id_b] || p.member_id_b} — ${p.reason} [${p.severity}]`;
          } else if (p.pattern_type === "task_incompatibility") {
            return `  ✗ AVOID ASSIGNING: ${memberNameMap[p.member_id] || p.member_id} to "${p.task_type || "this task type"}" — ${p.reason} [${p.severity}]`;
          } else if (p.pattern_type === "performance_insight") {
            const sev = p.severity === "info" ? "✓ POSITIVE" : p.severity === "caution" ? "⚠ CAUTION" : "✗ CONCERN";
            return `  ${sev}: ${memberNameMap[p.member_id] || p.member_id} — ${p.reason}`;
          }
          return `  - ${p.pattern_type}: ${p.reason}`;
        }).join("\n")
      : "No behavioral patterns recorded yet for this team. Use skill-based assignment.";

    const prompt = await promptTemplate.invoke({
      projectName: project.name,
      sprintName: sprint.name,
      phaseNum: phase,
      phaseName: phaseName,
      phaseBefore: phaseBefore || "N/A",
      phaseAfter: phaseAfter || "N/A",
      nextSequence,
      duration: durationDays,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
      targetMilestones: targetMilestones
        .map((m: any) => `- ${m.title} (Week ${m.week}): ${m.deliverable}`)
        .join("\n"),
      existingTasks:
        existingTaskCount > 0
          ? existingMilestoneTasks
              ?.map(
                (t: any) =>
                  `- [Seq ${t.task_sequence}] ${t.title} (${t.priority}): ${t.description}`
              )
              .join("\n")
          : "None — This is the first sprint for this milestone.",
      team: JSON.stringify(filteredTeamMembers.map((m: any) => {
        const sp = sprintStats[m.id];
        const ms = msStats[m.id];
        return {
          id: m.id,
          name: m.full_name,
          role: m.job_title,
          skills: m.skills,
          performance_score: m.performance_score ?? 100,
          sprint_completion_rate: sp && sp.assigned > 0
            ? `${Math.round((sp.done / sp.assigned) * 100)}% (${sp.done}/${sp.assigned} tasks done)`
            : "No sprint history",
          milestone_completion_rate: ms && ms.total > 0
            ? `${Math.round((ms.completed / ms.total) * 100)}% (${ms.completed}/${ms.total} milestones completed)`
            : "No milestone history",
        };
      })),
      patterns: patternsText,
    });

    const result = await structuredModel.invoke(prompt);

    // Insert tasks into DB — AI now returns exact member IDs directly
    const validMemberIds = new Set(filteredTeamMembers.map((m: any) => m.id));
    const toInsert = result.tasks.map((t: any, i: number) => ({
      sprint_id: sprintId,
      project_id: projectId,
      workspace_id: workspaceId,
      title: t.title,
      description: t.description,
      effort_level: t.effort_level,
      time_estimate_hours: t.time_estimate_hours,
      priority: t.priority,
      status: "backlog",
      created_by_ai: true,
      position: i,
      task_sequence: t.task_sequence,
      parent_milestone_id: sprint.milestone_ids[0],
      // Validate that the returned ID actually belongs to the team
      assigned_to: validMemberIds.has(t.assigned_member_id) ? t.assigned_member_id : null,
    }));

    const { data: inserted, error } = await supabase
      .from("sprint_tasks")
      .insert(toInsert)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tasks: inserted,
      count: inserted?.length || 0,
      phase,
      phaseName,
    });
  } catch (error: any) {
    console.error("AI Sprint Populate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
