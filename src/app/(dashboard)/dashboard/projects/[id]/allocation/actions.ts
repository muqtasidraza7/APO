"use server";

import { createClient } from "../../../../../utils/supabase/server";
import { getGroqModel } from "../../../../../utils/ai";
import { smartAllocationSchema } from "../../../../../utils/schemas";
import { PromptTemplate } from "@langchain/core/prompts";
import { revalidatePath } from "next/cache";

export async function runSmartAllocation(projectId: string) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("ai_data, workspace_id, name")
    .eq("id", projectId)
    .single();

  if (!project || !project.ai_data) {
    return { error: "Project AI data is missing. Please re-run the analysis." };
  }

  const { data: team, error: teamError } = await supabase
    .from("team_members")
    .select("id, job_title, skills, capacity_hours_per_week, status, hourly_rate, performance_score")
    .eq("workspace_id", project.workspace_id);

  if (teamError) return { error: "Failed to fetch team members." };
  if (!team || team.length === 0) {
    return { error: "No team members found. Please go to the Team page and add members before running allocation." };
  }

  // Fetch current global workload (all assignments across workspace)
  const { data: globalAssignments } = await supabase
    .from("project_assignments")
    .select("resource_id, id");
    
  const workloadMap: Record<string, number> = {};
  globalAssignments?.forEach(a => {
      if (a.resource_id) {
          workloadMap[a.resource_id] = (workloadMap[a.resource_id] || 0) + 1;
      }
  });

  // Fetch all unresolved patterns for this workspace
  const { data: patterns } = await supabase
    .from("worker_patterns")
    .select("*")
    .eq("workspace_id", project.workspace_id)
    .eq("resolved", false);

  // Build member lookup for names
  const memberMap: Record<string, string> = {};
  for (const m of team) {
      memberMap[m.id] = m.job_title || "Team Member";
  }

  // Separate patterns by type for the prompt
  const taskPatterns = (patterns || [])
      .filter((p: any) => p.pattern_type === "task_incompatibility")
      .map((p: any) => ({
          worker_id: p.member_id,
          worker_name: memberMap[p.member_id] || p.member_id,
          task_type: p.task_type || "General",
          task_title: p.task_title || null,
          reason: p.reason,
          severity: p.severity,
          date: new Date(p.created_at).toLocaleDateString("en-GB"),
      }));

  const groupPatterns = (patterns || [])
      .filter((p: any) => p.pattern_type === "group_conflict")
      .map((p: any) => ({
          worker_a_id: p.member_id_a,
          worker_b_id: p.member_id_b,
          worker_a_name: memberMap[p.member_id_a] || p.member_id_a,
          worker_b_name: memberMap[p.member_id_b] || p.member_id_b,
          reason: p.reason,
          severity: p.severity,
          date: new Date(p.created_at).toLocaleDateString("en-GB"),
      }));

  const milestones = project.ai_data.milestones || [];
  if (milestones.length === 0) {
    return { error: "No milestones found in project data. Please re-run the AI analysis." };
  }

  const teamJson = JSON.stringify(
    team.map(m => ({
      id: m.id,
      role: m.job_title || "Team Member",
      skills: m.skills || [],
      capacity_hours_per_week: m.capacity_hours_per_week || 40,
      current_assigned_tasks: workloadMap[m.id] || 0,
      status: m.status,
      performance_score: m.performance_score ?? 100,
    }))
  );

  const patternsSection = taskPatterns.length === 0 && groupPatterns.length === 0
      ? "No patterns recorded — assign freely based on skills."
      : `WORKER-TASK INCOMPATIBILITIES (avoid these combinations):
${JSON.stringify(taskPatterns, null, 2)}

GROUP CONFLICTS (do not co-assign these pairs to the same project):
${JSON.stringify(groupPatterns, null, 2)}`;

  const model = getGroqModel(0.1);
  const structuredModel = model.withStructuredOutput(smartAllocationSchema);

  const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Project Manager AI. Assign these PROJECT MILESTONES to the most suitable TEAM MEMBERS.

ASSIGNMENT RULES:
1. Match based on skills and role relevance
2. Distribute work fairly — don't assign everything to one person
3. Each milestone needs exactly ONE assignee
4. Only use IDs from the TEAM list below
5. CRITICAL: Do NOT assign a member to a task if a BLOCKER pattern exists for that worker-task combination
6. For CAUTION patterns, you may still assign but MUST mention the pattern in the reasoning
7. Prefer members with higher performance_score when skill match is equal
8. Do NOT co-assign two members with a BLOCKER group_conflict to the same project milestones
9. RISK ASSESSMENT: Consider the 'current_assigned_tasks' vs 'capacity_hours_per_week'. If you assign a task to someone who already has many tasks, output a 'dependency_risk_warning' explaining they might be a bottleneck.

PROJECT: "{projectName}"

MILESTONES: 
{milestones}

TEAM MEMBERS: 
{teamJson}

PATTERN MEMORY:
{patternsSection}
`);

  try {
    const prompt = await promptTemplate.invoke({
      projectName: project.name,
      milestones: JSON.stringify(milestones),
      teamJson: teamJson,
      patternsSection: patternsSection,
    });

    const result = await structuredModel.invoke(prompt);

    const validIds = new Set(team.map(m => m.id));
    const validAssignments = (result.assignments || []).filter((a: any) => validIds.has(a.worker_id));

    if (validAssignments.length === 0) {
      return { error: "AI returned invalid assignments. Please try again." };
    }

    await supabase.from("project_assignments").delete().eq("project_id", projectId);

    const inserts = validAssignments.map((a: any) => ({
      project_id: projectId,
      resource_id: a.worker_id,
      task_name: a.task_name,
      week_number: a.week_number,
      match_reason: a.reasoning + (a.dependency_risk_warning ? `\n⚠️ Risk: ${a.dependency_risk_warning}` : ""),
    }));

    const { error: insertError } = await supabase.from("project_assignments").insert(inserts);
    if (insertError) throw insertError;

    revalidatePath(`/dashboard/projects/${projectId}/allocation`);
    return { success: true, assigned_count: inserts.length };

  } catch (err: any) {
    console.error("AI Allocation Error:", err);
    return { error: err.message };
  }
}

export async function confirmAllocation(projectId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: assignments, error: fetchErr } = await supabase
    .from("project_assignments")
    .select("id, task_name, week_number, resource_id")
    .eq("project_id", projectId);

  if (fetchErr || !assignments || assignments.length === 0) {
    return { error: "No assignments found to confirm." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name, workspace_id")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found." };

  const activities = assignments.map((a: any) => ({
    workspace_id: project.workspace_id,
    user_id: user.id,
    team_member_id: a.resource_id,
    activity_type: "task_assigned",
    entity_type: "milestone",
    entity_id: projectId,
    description: `Assigned: ${a.task_name}`,
    metadata: {
      task_title: a.task_name,
      project_name: project.name,
      project_id: projectId,
      estimated_hours: 8,
      week: a.week_number,
      status: "active",
      confirmed_from: "allocation_page",
    },
  }));

  const { error: actErr } = await supabase.from("team_activity").insert(activities);
  if (actErr) {
    console.error("team_activity insert error:", actErr);
    return { error: "Failed to update team workload: " + actErr.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  revalidatePath("/dashboard/team");
  return { success: true, confirmed_count: activities.length };
}

export async function rejectAllocation(projectId: string) {
  const supabase = await createClient();
  await supabase.from("project_assignments").delete().eq("project_id", projectId);
  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  return { success: true };
}