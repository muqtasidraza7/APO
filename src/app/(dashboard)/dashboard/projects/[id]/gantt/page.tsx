import { createClient } from "../../../../../utils/supabase/server";
import { redirect } from "next/navigation";
import GanttClient from "./GanttClient";

export default async function GanttPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("name, ai_data, created_at")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  const { data: sprints } = await supabase
    .from("sprints")
    .select("id, name, start_date, end_date, status")
    .eq("project_id", id)
    .is("deleted_at", null)
    .order("start_date");

  const rawMilestones: any[] = project.ai_data?.milestones || [];
  const totalWeeks: number = project.ai_data?.timeline_weeks || 12;

  const seen = new Set<string>();
  const milestones = rawMilestones
    .filter((ms) => {
      if (!ms.title || seen.has(ms.title)) return false;
      seen.add(ms.title);
      return true;
    })
    .sort((a, b) => (a.week || a.week_number || 0) - (b.week || b.week_number || 0));

  return (
    <GanttClient
      projectId={id}
      projectName={project.name}
      projectStart={project.created_at}
      totalWeeks={totalWeeks}
      milestones={milestones}
      sprints={(sprints || []) as any[]}
    />
  );
}
