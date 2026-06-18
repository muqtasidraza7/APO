"use server";

import { createClient } from "../../../../../utils/supabase/server";
import { createAdminClient } from "../../../../../utils/supabase/admin";
import { createNotification } from "../../../../../utils/notifications";
import { getGroqModel } from "../../../../../utils/ai";
import { smartAllocationSchema } from "../../../../../utils/schemas";
import { PromptTemplate } from "@langchain/core/prompts";
import { revalidatePath } from "next/cache";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getCurrentAssignments(admin: ReturnType<typeof createAdminClient>, projectId: string) {
  const { data } = await admin
    .from("project_assignments")
    .select("task_name, week_number, resource_id, match_reason")
    .eq("project_id", projectId);
  return data || [];
}

async function logHistory(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
  workspaceId: string,
  userId: string,
  performedByName: string,
  action: string,
  note: string | null,
  before: any[],
  after: any[]
) {
  try {
    await admin.from("allocation_history").insert({
      project_id: projectId,
      workspace_id: workspaceId,
      action,
      note: note || null,
      performed_by: userId,
      performed_by_name: performedByName,
      assignment_count: after.length,
      assignments_before: before,
      assignments_after: after,
    });
  } catch {
    // Non-fatal
  }
}

async function getPerformerName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, workspaceId: string) {
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return member?.full_name || "Unknown";
}

// ── Sync Assignments to AI Data ────────────────────────────────────────────────
async function syncAssignmentsToAiData(admin: ReturnType<typeof createAdminClient>, projectId: string) {
  const { data: assignments } = await admin
    .from("project_assignments")
    .select("task_name, resource_id")
    .eq("project_id", projectId);

  if (!assignments) return;

  const milestoneMembers: Record<string, string[]> = {};
  assignments.forEach(a => {
    const title = (a.task_name || "").trim().toLowerCase();
    if (!milestoneMembers[title]) milestoneMembers[title] = [];
    milestoneMembers[title].push(a.resource_id);
  });

  const { data: project } = await admin
    .from("projects")
    .select("ai_data")
    .eq("id", projectId)
    .single();

  if (project?.ai_data?.milestones) {
    const updatedMilestones = (project.ai_data.milestones as any[]).map((m: any) => {
      const title = (m.title || "").trim().toLowerCase();
      return {
        ...m,
        assigned_member_ids: milestoneMembers[title] || [],
      };
    });

    await admin
      .from("projects")
      .update({ ai_data: { ...project.ai_data, milestones: updatedMilestones } })
      .eq("id", projectId);
  }
}

// ── Run AI Allocation ─────────────────────────────────────────────────────────

export async function runSmartAllocation(projectId: string, note?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

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
    .select("id, user_id, job_title, skills, capacity_hours_per_week, status, hourly_rate, performance_score")
    .eq("workspace_id", project.workspace_id);

  if (teamError) return { error: "Failed to fetch team members." };
  if (!team || team.length === 0) {
    return { error: "No team members found. Please go to the Team page and add members before running allocation." };
  }

  const userIds = team.map(m => m.user_id).filter(Boolean);
  const { data: wsMembers } = userIds.length > 0
    ? await supabase
        .from("workspace_members")
        .select("user_id, experience_level, years_of_experience")
        .in("user_id", userIds)
    : { data: [] };
  const expByUserId: Record<string, any> = {};
  for (const wm of wsMembers || []) {
    if (wm.user_id) expByUserId[wm.user_id] = wm;
  }

  const { data: globalAssignments } = await supabase
    .from("project_assignments")
    .select("resource_id, id");
  const workloadMap: Record<string, number> = {};
  (globalAssignments || []).forEach(a => {
    if (a.resource_id) workloadMap[a.resource_id] = (workloadMap[a.resource_id] || 0) + 1;
  });

  const { data: patterns } = await supabase
    .from("worker_patterns")
    .select("*")
    .eq("workspace_id", project.workspace_id)
    .eq("resolved", false);

  const memberMap: Record<string, string> = {};
  for (const m of team) memberMap[m.id] = m.job_title || "Team Member";

  const taskPatterns = (patterns || [])
    .filter((p: any) => p.pattern_type === "task_incompatibility")
    .map((p: any) => ({
      worker_id: p.member_id,
      worker_name: memberMap[p.member_id] || p.member_id,
      task_type: p.task_type || "General",
      reason: p.reason,
      severity: p.severity,
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
    }));

  const milestones = project.ai_data.milestones || [];
  if (milestones.length === 0) {
    return { error: "No milestones found in project data. Please re-run the AI analysis." };
  }

  const teamJson = JSON.stringify(
    team.map(m => {
      const exp = m.user_id ? (expByUserId[m.user_id] || {}) : {};
      return {
        id: m.id,
        role: m.job_title || "Team Member",
        skills: m.skills || [],
        capacity_hours_per_week: m.capacity_hours_per_week || 40,
        current_assigned_tasks: workloadMap[m.id] || 0,
        status: m.status,
        performance_score: m.performance_score ?? 100,
        experience_level: exp.experience_level || null,
        years_of_experience: exp.years_of_experience ?? null,
      };
    })
  );

  const patternsSection = taskPatterns.length === 0 && groupPatterns.length === 0
    ? "No patterns recorded — assign freely based on skills."
    : `WORKER-TASK INCOMPATIBILITIES:\n${JSON.stringify(taskPatterns, null, 2)}\n\nGROUP CONFLICTS:\n${JSON.stringify(groupPatterns, null, 2)}`;

  const model = getGroqModel(0.1);
  const structuredModel = model.withStructuredOutput(smartAllocationSchema);

  const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Project Manager AI. Assign these PROJECT MILESTONES to the most suitable TEAM MEMBERS.

ASSIGNMENT RULES:
1. Match based on skills and role relevance
2. Distribute work fairly — no single member should appear in more than 40% of all milestone assignments
3. Each milestone requires 1 to 5 team members — choose the right number based on scope
4. Only use IDs from the TEAM list below
5. CRITICAL: Do NOT assign a member to a task if a BLOCKER pattern exists for that worker-task combination
6. For CAUTION patterns, you may still assign but MUST mention the pattern in the reasoning
7. Prefer members with higher performance_score when skill match is equal
8. Do NOT co-assign two members with a BLOCKER group_conflict to the same milestone
9. RISK ASSESSMENT: Consider 'current_assigned_tasks' vs 'capacity_hours_per_week'. If a member already has many tasks, output a 'dependency_risk_warning'.
10. EXPERIENCE MATCHING:
    - Junior (0-2 yrs): low-complexity tasks only
    - Mid-Level (2-5 yrs): standard feature development
    - Senior (5-8 yrs): complex, architectural milestones
    - Lead (8+ yrs): high-impact, cross-team milestones
    - Always mention experience match in reasoning.
11. NON-SELECTION RATIONALE (required in 'non_selection_notes'):
    - If assigning 1 member: name 1–2 other team members who were considered but not chosen, and briefly state why (e.g., skill mismatch, overloaded, experience too junior, blocker pattern).
    - If assigning 2+ members: briefly explain the group synergy — why THIS combination of members works well for this milestone specifically.

PROJECT: "{projectName}"
MILESTONES: {milestones}
TEAM MEMBERS: {teamJson}
PATTERN MEMORY: {patternsSection}
`);

  try {
    const prompt = await promptTemplate.invoke({
      projectName: project.name,
      milestones: JSON.stringify(milestones),
      teamJson,
      patternsSection,
    });

    const result = await structuredModel.invoke(prompt);
    const validIds = new Set(team.map(m => m.id));
    const validAssignments = (result.assignments || [])
      .map((a: any) => ({
        ...a,
        worker_ids: (a.worker_ids as string[]).filter((id) => validIds.has(id)),
      }))
      .filter((a: any) => a.worker_ids.length > 0);

    if (validAssignments.length === 0) {
      return { error: "AI returned invalid assignments. Please try again." };
    }

    const inserts = validAssignments.flatMap((a: any) =>
      a.worker_ids.map((workerId: string) => ({
        project_id: projectId,
        resource_id: workerId,
        task_name: a.task_name,
        week_number: a.week_number,
        match_reason: a.reasoning
          + (a.non_selection_notes ? `\n\n${a.non_selection_notes}` : "")
          + (a.dependency_risk_warning ? `\n\n⚠️ Risk: ${a.dependency_risk_warning}` : ""),
      }))
    );

    const admin = createAdminClient();
    const before = await getCurrentAssignments(admin, projectId);
    const performedByName = await getPerformerName(supabase, user.id, project.workspace_id);

    await supabase.from("project_assignments").delete().eq("project_id", projectId);
    const { error: insertError } = await supabase.from("project_assignments").insert(inserts);
    if (insertError) throw insertError;

    const afterSnap = inserts.map(i => ({
      task_name: i.task_name,
      week_number: i.week_number,
      resource_id: i.resource_id,
      match_reason: i.match_reason,
    }));

    await logHistory(admin, projectId, project.workspace_id, user.id, performedByName,
      "ai_run", note || null, before, afterSnap);

    revalidatePath(`/dashboard/projects/${projectId}/allocation`);
    return { success: true, assigned_count: inserts.length };
  } catch (err: any) {
    console.error("AI Allocation Error:", err);
    return { error: err.message };
  }
}

// ── Confirm (writes to team_activity) ────────────────────────────────────────

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
  if (actErr) return { error: "Failed to update team workload: " + actErr.message };

  // Notify each unique assigned member (fire-and-forget)
  const admin = createAdminClient();
  const uniqueMemberIds = [...new Set(assignments.map((a: any) => a.resource_id))];
  const { data: members } = await admin
    .from("team_members")
    .select("id, user_id")
    .in("id", uniqueMemberIds);

  for (const member of (members || [])) {
    if (!member.user_id) continue;
    const memberTasks = assignments
      .filter((a: any) => a.resource_id === member.id)
      .map((a: any) => a.task_name)
      .join(", ");
    createNotification({
      userId: member.user_id,
      type: "task_assigned",
      title: "New milestone assignments",
      body: `You were assigned to: ${memberTasks} in ${project.name}`,
      link: `/dashboard/projects/${projectId}/allocation`,
    });
  }

  await syncAssignmentsToAiData(admin, projectId);

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  revalidatePath("/dashboard/team");
  revalidatePath(`/dashboard/projects/${projectId}/roadmap`);
  return { success: true, confirmed_count: activities.length };
}

// ── Undo last allocation ──────────────────────────────────────────────────────

export async function undoAllocation(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  // Find the most recent history entry that hasn't been undone
  const { data: historyEntries } = await admin
    .from("allocation_history")
    .select("id, assignments_before, workspace_id, action")
    .eq("project_id", projectId)
    .neq("action", "undone")
    .order("created_at", { ascending: false })
    .limit(1);

  const latest = historyEntries?.[0];
  if (!latest) return { error: "No allocation history found to undo." };

  const restoredRows = (latest.assignments_before as any[] || []).map((a: any) => ({
    project_id: projectId,
    resource_id: a.resource_id,
    task_name: a.task_name,
    week_number: a.week_number,
    match_reason: a.match_reason || "Restored via undo",
  }));

  const currentBefore = await getCurrentAssignments(admin, projectId);
  const performedByName = await getPerformerName(supabase, user.id, latest.workspace_id);

  await admin.from("project_assignments").delete().eq("project_id", projectId);

  if (restoredRows.length > 0) {
    const { error: insertError } = await admin.from("project_assignments").insert(restoredRows);
    if (insertError) return { error: "Failed to restore allocation: " + insertError.message };
  }

  await logHistory(admin, projectId, latest.workspace_id, user.id, performedByName,
    "undone", `Undid: ${latest.action}`, currentBefore, restoredRows);

  await syncAssignmentsToAiData(admin, projectId);

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  revalidatePath("/dashboard/team");
  revalidatePath(`/dashboard/projects/${projectId}/roadmap`);
  return { success: true };
}

// ── Save current as named scenario ───────────────────────────────────────────

export async function saveCurrentAsScenario(projectId: string, name: string, note?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found" };

  const currentAssignments = await getCurrentAssignments(admin, projectId);
  const performedByName = await getPerformerName(supabase, user.id, project.workspace_id);

  const { error } = await admin.from("allocation_scenarios").insert({
    project_id: projectId,
    workspace_id: project.workspace_id,
    name: name.trim() || "Unnamed Scenario",
    source: "manual",
    note: note || null,
    created_by: user.id,
    created_by_name: performedByName,
    assignments: currentAssignments,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  return { success: true };
}

// ── Activate a saved scenario ─────────────────────────────────────────────────

export async function activateScenario(projectId: string, scenarioId: string, note?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: scenario } = await admin
    .from("allocation_scenarios")
    .select("assignments, workspace_id, name")
    .eq("id", scenarioId)
    .single();

  if (!scenario) return { error: "Scenario not found" };

  const before = await getCurrentAssignments(admin, projectId);
  const performedByName = await getPerformerName(supabase, user.id, scenario.workspace_id);

  const rows = (scenario.assignments as any[] || []).map((a: any) => ({
    project_id: projectId,
    resource_id: a.resource_id,
    task_name: a.task_name,
    week_number: a.week_number,
    match_reason: a.match_reason || "Restored from scenario",
  }));

  await admin.from("project_assignments").delete().eq("project_id", projectId);

  if (rows.length > 0) {
    const { error: insertError } = await admin.from("project_assignments").insert(rows);
    if (insertError) return { error: "Failed to activate scenario: " + insertError.message };
  }

  await logHistory(admin, projectId, scenario.workspace_id, user.id, performedByName,
    "scenario_activated", note || `Activated: ${scenario.name}`, before, rows);

  await syncAssignmentsToAiData(admin, projectId);

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  revalidatePath("/dashboard/team");
  revalidatePath(`/dashboard/projects/${projectId}/roadmap`);
  return { success: true };
}

// ── Delete a scenario ─────────────────────────────────────────────────────────

export async function deleteScenario(scenarioId: string, projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { error } = await admin.from("allocation_scenarios").delete().eq("id", scenarioId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  return { success: true };
}

// ── Manually update members for one milestone ─────────────────────────────────

export async function updateMilestoneMembers(
  projectId: string,
  workspaceId: string,
  milestoneTitle: string,
  weekNumber: number,
  memberIds: string[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const before = await getCurrentAssignments(admin, projectId);
  const performedByName = await getPerformerName(supabase, user.id, workspaceId);

  // Delete existing rows for this milestone (ilike = case-insensitive, handles AI casing mismatches)
  const { data: toDelete } = await admin
    .from("project_assignments")
    .select("id")
    .eq("project_id", projectId)
    .ilike("task_name", milestoneTitle);
  if (toDelete && toDelete.length > 0) {
    await admin.from("project_assignments").delete().in("id", toDelete.map((r: any) => r.id));
  }

  const newRows = memberIds.map(memberId => ({
    project_id: projectId,
    resource_id: memberId,
    task_name: milestoneTitle,
    week_number: weekNumber,
    match_reason: "Manually assigned",
  }));

  if (newRows.length > 0) {
    const { error } = await admin.from("project_assignments").insert(newRows);
    if (error) return { error: error.message };
  }

  // Rebuild full current after edit
  const after = before
    .filter(a => a.task_name !== milestoneTitle)
    .concat(newRows.map(r => ({
      task_name: r.task_name,
      week_number: r.week_number,
      resource_id: r.resource_id,
      match_reason: r.match_reason,
    })));

  await logHistory(admin, projectId, workspaceId, user.id, performedByName,
    "manual_edit", `Updated: ${milestoneTitle}`, before, after);

  // Notify newly assigned members
  if (memberIds.length > 0) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    const { data: assignedMembers } = await admin
      .from("team_members")
      .select("id, user_id")
      .in("id", memberIds);
    for (const m of (assignedMembers || [])) {
      if (m.user_id && m.user_id !== user.id) {
        createNotification({
          userId: m.user_id,
          type: "task_assigned",
          title: "Milestone assignment updated",
          body: `You were manually assigned to "${milestoneTitle}"${project?.name ? ` in ${project.name}` : ""}`,
          link: `/dashboard/projects/${projectId}/allocation`,
        });
      }
    }
  }


  await syncAssignmentsToAiData(admin, projectId);

  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  revalidatePath("/dashboard/team");
  revalidatePath(`/dashboard/projects/${projectId}/roadmap`);
  return { success: true };
}

// ── Reject (discard pending AI run) ──────────────────────────────────────────

export async function rejectAllocation(projectId: string) {
  const supabase = await createClient();
  await supabase.from("project_assignments").delete().eq("project_id", projectId);
  revalidatePath(`/dashboard/projects/${projectId}/allocation`);
  return { success: true };
}
