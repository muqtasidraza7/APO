import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { createAdminClient } from "../../utils/supabase/admin";
import { getGroqModel } from "../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question, workspaceId, projectId } = await request.json();
    if (!question || !workspaceId) {
      return NextResponse.json({ error: "question and workspaceId are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch all data in parallel
    const [
      { data: members },
      { data: patterns },
      { data: sprints },
      { data: projects },
      { data: activity },
    ] = await Promise.all([
      admin
        .from("team_members")
        .select("id, full_name, job_title, skills, capacity_hours_per_week, performance_score")
        .eq("workspace_id", workspaceId),

      admin
        .from("worker_patterns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(60),

      admin
        .from("sprints")
        .select("id, name, status, start_date, end_date, milestone_ids, retrospective_notes, project_id")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20),

      admin
        .from("projects")
        .select("id, name, ai_data, status")
        .eq("workspace_id", workspaceId),

      admin
        .from("team_activity")
        .select("team_member_id, activity_type, description, metadata, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    // Build lookup maps
    const memberMap: Record<string, any> = {};
    for (const m of members || []) memberMap[m.id] = m;

    const projectMap: Record<string, any> = {};
    for (const p of projects || []) projectMap[p.id] = p;

    // Fetch sprint tasks for completed sprints only (for performance data)
    const completedSprintIds = (sprints || [])
      .filter((s: any) => s.status === "completed")
      .map((s: any) => s.id)
      .slice(0, 10);

    let sprintTasks: any[] = [];
    if (completedSprintIds.length > 0) {
      const { data: tasks } = await admin
        .from("sprint_tasks")
        .select("sprint_id, assigned_to, status, time_estimate_hours, completed_at, title, parent_milestone_id")
        .in("sprint_id", completedSprintIds);
      sprintTasks = tasks || [];
    }

    // Build enriched member context
    const enrichedMembers = (members || []).map((m: any) => {
      // Performance stats from completed sprints
      const memberTasks = sprintTasks.filter((t: any) => t.assigned_to === m.id);
      const totalAssigned = memberTasks.length;
      const totalDone = memberTasks.filter((t: any) => t.status === "done").length;
      const completionRate = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : null;

      // Current milestone assignments
      const assignedMilestones: string[] = [];
      for (const project of projects || []) {
        for (const ms of (project.ai_data?.milestones || [])) {
          if ((ms.assigned_member_ids || []).includes(m.id)) {
            assignedMilestones.push(`${ms.title} (${project.name}, status: ${ms.status || "pending"})`);
          }
        }
      }

      return {
        id: m.id,
        name: m.full_name || m.job_title || "Team Member",
        role: m.job_title || "Team Member",
        skills: m.skills || [],
        capacity_hours_per_week: m.capacity_hours_per_week || 40,
        performance_score: m.performance_score ?? 100,
        sprint_history: totalAssigned > 0
          ? `${totalDone}/${totalAssigned} tasks done across ${completedSprintIds.length} sprints (${completionRate}% completion rate)`
          : "No sprint history yet",
        current_milestones: assignedMilestones,
      };
    });

    // Build enriched patterns context
    const enrichedPatterns = (patterns || []).map((p: any) => {
      const base = {
        type: p.pattern_type,
        reason: p.reason,
        severity: p.severity,
        resolved: p.resolved,
        date: new Date(p.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }),
        project: p.project_id ? (projectMap[p.project_id]?.name || p.project_id) : null,
      };

      if (p.pattern_type === "task_incompatibility") {
        return { ...base, member: memberMap[p.member_id]?.full_name || p.member_id, task: p.task_title || p.task_type };
      } else if (p.pattern_type === "group_conflict") {
        return { ...base, member_a: memberMap[p.member_id_a]?.full_name || p.member_id_a, member_b: memberMap[p.member_id_b]?.full_name || p.member_id_b };
      } else if (p.pattern_type === "collaboration_positive") {
        return { ...base, member_a: memberMap[p.member_id_a]?.full_name || p.member_id_a, member_b: memberMap[p.member_id_b]?.full_name || p.member_id_b };
      } else if (p.pattern_type === "performance_insight") {
        return { ...base, member: memberMap[p.member_id]?.full_name || p.member_id };
      }
      return base;
    });

    // Build sprint history context
    const sprintHistory = (sprints || []).map((s: any) => {
      const tasks = sprintTasks.filter((t: any) => t.sprint_id === s.id);
      const done = tasks.filter((t: any) => t.status === "done").length;
      const memberNames = [...new Set(
        tasks.map((t: any) => memberMap[t.assigned_to]?.full_name).filter(Boolean)
      )];

      return {
        name: s.name,
        project: projectMap[s.project_id]?.name || "Unknown Project",
        status: s.status,
        dates: `${s.start_date} → ${s.end_date}`,
        milestones: s.milestone_ids || [],
        team: memberNames,
        completion: tasks.length > 0 ? `${done}/${tasks.length} tasks done` : "No tasks",
        retrospective: s.retrospective_notes || null,
      };
    });

    // Build project milestone context
    const projectContext = (projects || []).map((p: any) => ({
      name: p.name,
      status: p.status,
      milestones: (p.ai_data?.milestones || []).map((m: any) => ({
        title: m.title,
        week: m.week,
        status: m.status || "pending",
        assigned_to: (m.assigned_member_ids || [])
          .map((id: string) => memberMap[id]?.full_name || id)
          .filter(Boolean),
        completion_pct: m.completion_percentage || 0,
      })),
    }));

    // Build recent activity context
    const activityContext = (activity || []).map((a: any) => ({
      member: memberMap[a.team_member_id]?.full_name || a.team_member_id,
      action: a.activity_type,
      detail: a.description,
      date: new Date(a.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }),
    }));

    const model = getGroqModel(0.35);
    const parser = new StringOutputParser();

    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert AI Project Intelligence Advisor with full visibility into a team's performance, behavioral patterns, and project assignments.

A Project Manager is asking:
"{question}"

Use ALL the data below to give a thorough, specific, and actionable answer. Always cite names, dates, numbers, and patterns when relevant. Be direct and professional.

═══════════════════════════════════════
TEAM MEMBERS (performance + assignments):
{members}

═══════════════════════════════════════
BEHAVIORAL & PERFORMANCE PATTERNS (from sprint analysis):
{patterns}

═══════════════════════════════════════
SPRINT HISTORY (recent 20 sprints):
{sprints}

═══════════════════════════════════════
ACTIVE PROJECTS & MILESTONES:
{projects}

═══════════════════════════════════════
RECENT TEAM ACTIVITY (last 40 events):
{activity}

═══════════════════════════════════════

ANSWERING GUIDELINES:
- For assignment questions ("Why was X assigned to Y?"): Reference skills match, performance score, collaboration patterns, and current workload.
- For pairing questions ("Why are A and B together?"): Look for collaboration_positive patterns or complementary skills.
- For avoidance questions ("Why not Person A?"): Look for task_incompatibility or group_conflict patterns, or skill/capacity mismatches.
- For performance questions: Reference sprint_history completion rates, performance_score, and performance_insight patterns.
- For future steps ("What should Person A focus on next?"): Look at their current milestone assignments, backlog, and performance trends.
- If there are no patterns yet, say so honestly and recommend what data would help.
- Always be specific — vague answers are unhelpful.
`);

    const prompt = await promptTemplate.invoke({
      question,
      members: JSON.stringify(enrichedMembers, null, 2),
      patterns: enrichedPatterns.length > 0 ? JSON.stringify(enrichedPatterns, null, 2) : "No behavioral patterns recorded yet for this workspace.",
      sprints: JSON.stringify(sprintHistory, null, 2),
      projects: JSON.stringify(projectContext, null, 2),
      activity: activityContext.length > 0 ? JSON.stringify(activityContext, null, 2) : "No recent activity.",
    });

    const answer = await model.pipe(parser).invoke(prompt);

    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    console.error("Insights error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
