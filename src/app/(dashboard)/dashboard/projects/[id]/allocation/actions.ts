"use server";

import { createClient } from "../../../../../utils/supabase/server";
import Groq from "groq-sdk";
import { revalidatePath } from "next/cache";

export async function runSmartAllocation(projectId: string) {
  const supabase = await createClient();
  
  console.log("1. Starting Allocation for:", projectId);

  // 1. Fetch Project Data
  const { data: project } = await supabase
    .from("projects")
    .select("ai_data, workspace_id")
    .eq("id", projectId)
    .single();

  if (!project || !project.ai_data) {
    console.error("Error: Project data missing");
    return { error: "Project AI data is missing. Please re-run the analysis." };
  }

  // 2. Fetch Team Data
  // CRITICAL CHECK: Do we actually have people to assign?
  const { data: team } = await supabase
    .from("team_resources")
    .select("id, full_name, job_title, skills, hourly_rate")
    .eq("workspace_id", project.workspace_id);

  if (!team || team.length === 0) {
    console.error("Error: Team is empty");
    return { error: "No team members found. Please go to the Team page and 'Generate Dummy Team' first." };
  }

  // 3. AI Prompt
  if (!process.env.GROQ_API_KEY) return { error: "Missing Groq API Key" };
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `
    You are an expert Project Manager. Map these TASKS to these WORKERS.
    
    TASKS: ${JSON.stringify(project.ai_data.milestones)}
    WORKERS: ${JSON.stringify(team)}

    Return JSON:
    {
      "assignments": [
        { 
          "task_name": "Exact title from milestone", 
          "week_number": 1, 
          "worker_id": "UUID from worker list", 
          "reasoning": "Short reason why" 
        }
      ]
    }
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      "messages": [{ "role": "user", "content": prompt }],
      "model": "llama-3.3-70b-versatile",
      "temperature": 0.1,
      "response_format": { type: "json_object" }
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(content);
    
    // 4. Save to Database
    if (result.assignments && result.assignments.length > 0) {
      // Clean slate
      await supabase.from("project_assignments").delete().eq("project_id", projectId);

      const inserts = result.assignments.map((a: any) => ({
        project_id: projectId,
        resource_id: a.worker_id,
        task_name: a.task_name,
        week_number: a.week_number,
        match_reason: a.reasoning
      }));

      const { error } = await supabase.from("project_assignments").insert(inserts);
      if (error) throw error;
    }

    revalidatePath(`/dashboard/projects/${projectId}/allocation`);
    return { success: true };

  } catch (err: any) {
    console.error("AI Allocation Error:", err);
    return { error: err.message };
  }
}