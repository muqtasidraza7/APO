"use server";

import { createClient } from "../../../../../utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleAssignmentStatus(
  assignmentId: string,
  projectId: string,
  taskName: string,
  currentStatus: string,
  resourceId?: string
) {
  const supabase = await createClient();
  const newStatus = currentStatus === "completed" ? "pending" : "completed";
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Update project_assignments status
  const { error: assignError } = await supabase
    .from("project_assignments")
    .update({ status: newStatus })
    .eq("id", assignmentId);

  if (assignError) throw new Error(assignError.message);

  // 2. Sync ai_data milestones
  const { data: project } = await supabase
    .from("projects")
    .select("ai_data, workspace_id, name")
    .eq("id", projectId)
    .single();

  if (project?.ai_data?.milestones) {
    const updatedMilestones = project.ai_data.milestones.map((m: any) => {
      const mTitle = m.title || m.task_name;
      if (mTitle === taskName) {
        return {
          ...m,
          status: newStatus,
          completion_percentage: newStatus === "completed" ? 100 : 0,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null,
          completed_by: newStatus === "completed" && user ? user.id : null,
        };
      }
      return m;
    });

    await supabase
      .from("projects")
      .update({ ai_data: { ...project.ai_data, milestones: updatedMilestones } })
      .eq("id", projectId);
  }

  // 3. Log task_completed or task_reopened event to team_activity
  // This drives the team workload engine — completed tasks reduce capacity pressure
  if (project && resourceId && user) {
    const activityType = newStatus === "completed" ? "task_completed" : "task_assigned";
    await supabase.from("team_activity").insert({
      workspace_id: project.workspace_id,
      user_id: user.id,
      team_member_id: resourceId,
      activity_type: activityType,
      entity_type: "milestone",
      entity_id: projectId,
      description: newStatus === "completed"
        ? `Completed: ${taskName}`
        : `Reopened: ${taskName}`,
      metadata: {
        task_title: taskName,
        project_name: project.name,
        project_id: projectId,
        estimated_hours: 8,
        status: newStatus,
      },
    });
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/dashboard/projects/${projectId}/roadmap`);
  revalidatePath("/dashboard/team");

  return { success: true, newStatus };
}