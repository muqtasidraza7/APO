"use server";

import { createClient } from "../../../../../utils/supabase/server";
import Groq from "groq-sdk";
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
    .select("id, job_title, skills, capacity_hours_per_week, status, hourly_rate")
    .eq("workspace_id", project.workspace_id);

  if (teamError) return { error: "Failed to fetch team members." };
  if (!team || team.length === 0) {
    return { error: "No team members found. Please go to the Team page and add members before running allocation." };
  }

  if (!process.env.GROQ_API_KEY) return { error: "Missing Groq API Key" };
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      status: m.status,
      hourly_rate: m.hourly_rate,
    }))
  );

  const prompt = `
    You are an expert Project Manager. Assign these PROJECT MILESTONES to the most suitable TEAM MEMBERS.
    
    ASSIGNMENT RULES:
    - Match based on skills and role relevance
    - Distribute work fairly — don't assign everything to one person
    - Each milestone needs exactly ONE assignee
    - Only use IDs from the TEAM list below

    PROJECT: "${project.name}"
    MILESTONES: ${JSON.stringify(milestones)}
    TEAM: ${teamJson}

    Return ONLY this JSON (no extra text):
    {
      "assignments": [
        { 
          "task_name": "Exact milestone title", 
          "week_number": 1, 
          "worker_id": "UUID from team list", 
          "reasoning": "Short reason why this person fits"
        }
      ]
    }
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);

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
      match_reason: a.reasoning,
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