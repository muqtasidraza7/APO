"use server";

import { createClient } from "../../../../../utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function simulateNextWeek(projectId: string) {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("current_week, simulation_logs, ai_data")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found" };

  const newWeek = (project.current_week || 0) + 1;
  const maxWeeks = project.ai_data?.timeline_weeks || 12;

  if (newWeek > maxWeeks) {
    return { message: "Project is already completed!" };
  }

  const events = [
    { type: "success", msg: "Milestone achieved ahead of schedule." },
    { type: "info", msg: "Resources operating at optimal capacity." },
    { type: "warning", msg: "Minor latency detected in API integration task." },
    { type: "success", msg: "Client approved the initial wireframes." },
    { type: "warning", msg: "Database migration taking longer than expected." },
  ];
  
  const randomEvent = events[Math.floor(Math.random() * events.length)];
  
  const newLog = {
    week: newWeek,
    timestamp: new Date().toLocaleTimeString(),
    type: randomEvent.type,
    message: randomEvent.msg
  };

  await supabase
    .from("project_assignments")
    .update({ status: 'completed' })
    .eq("project_id", projectId)
    .lte("week_number", newWeek); 

  const updatedLogs = [newLog, ...(project.simulation_logs || [])].slice(0, 5); 

  const { error } = await supabase
    .from("projects")
    .update({
      current_week: newWeek,
      simulation_logs: updatedLogs
    })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}/roadmap`);
  return { success: true, week: newWeek };
}