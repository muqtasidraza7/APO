import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { getGroqModel } from "../../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

export const runtime = "nodejs";

const aiSprintTasksSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().describe("Short, actionable task title (max 10 words)"),
    description: z.string().describe("1-2 sentence description of what needs to be done"),
    story_points: z.number().int().describe("Effort estimate: 1=trivial, 2=small, 3=medium, 5=large, 8=complex, 13=very complex"),
    priority: z.enum(["high", "medium", "low"]),
  })),
});

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

    // Fetch project AI data (milestones, tasks)
    const { data: project } = await supabase
      .from("projects")
      .select("name, ai_data")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Fetch team members for context
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("job_title, skills, capacity_hours_per_week")
      .eq("workspace_id", workspaceId);

    const milestones = project.ai_data?.milestones || [];
    const tasks = project.ai_data?.tasks || [];

    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const model = getGroqModel(0.4);
    const structuredModel = model.withStructuredOutput(aiSprintTasksSchema);

    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Agile Sprint Planner. Generate a realistic sprint backlog for the following project sprint.

PROJECT: "{projectName}"
SPRINT NAME: "{sprintName}"
SPRINT GOAL: "{sprintGoal}"
SPRINT DURATION: {duration} days ({startDate} to {endDate})

PROJECT MILESTONES:
{milestones}

EXISTING PROJECT TASKS (use these as source material):
{tasks}

TEAM:
{team}

Generate 6-10 sprint tasks that:
1. Are achievable within {duration} days
2. Are derived from the project milestones and tasks above
3. Have realistic story point estimates (use Fibonacci: 1, 2, 3, 5, 8, 13)
4. Are specific and actionable (not vague like "work on project")
5. Cover a mix of high, medium, and low priorities
`);

    const prompt = await promptTemplate.invoke({
      projectName: project.name,
      sprintName: sprint.name,
      sprintGoal: sprint.goal || "Deliver core sprint objectives",
      duration: durationDays,
      startDate: sprint.start_date,
      endDate: sprint.end_date,
      milestones: milestones.length > 0 ? JSON.stringify(milestones.map((m: any) => ({ title: m.title, week: m.week, deliverable: m.deliverable }))) : "No milestones extracted",
      tasks: tasks.length > 0 ? JSON.stringify(tasks.map((t: any) => ({ title: t.title, description: t.description, estimated_hours: t.estimated_hours, priority: t.priority }))) : "No tasks extracted",
      team: teamMembers ? JSON.stringify(teamMembers.map(m => ({ role: m.job_title, skills: m.skills }))) : "No team members yet",
    });

    const result = await structuredModel.invoke(prompt);

    // Insert tasks into DB
    const toInsert = result.tasks.map((t: any, i: number) => ({
      sprint_id: sprintId,
      project_id: projectId,
      workspace_id: workspaceId,
      title: t.title,
      description: t.description,
      story_points: [1, 2, 3, 5, 8, 13].includes(t.story_points) ? t.story_points : 3,
      priority: t.priority,
      status: "backlog",
      created_by_ai: true,
      position: i,
    }));

    const { data: inserted, error } = await supabase
      .from("sprint_tasks")
      .insert(toInsert)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, tasks: inserted, count: inserted?.length || 0 });
  } catch (error: any) {
    console.error("AI Sprint Populate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
