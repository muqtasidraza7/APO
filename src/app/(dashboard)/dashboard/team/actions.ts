"use server";

import { createClient } from "../../../utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function generateDummyTeam(workspaceId: string) {
  const supabase = await createClient();

  const dummyWorkers = [
    { full_name: "Sarah Ali", email: "sarah@demo.com", job_title: "Senior React Dev", hourly_rate: 65, skills: ["React", "Next.js", "Tailwind", "Frontend"] },
    { full_name: "Muqtasid", email: "muqtasid@demo.com", job_title: "Backend Engineer", hourly_rate: 70, skills: ["Node.js", "PostgreSQL", "Python", "API Design"] },
    { full_name: "Sheraz", email: "sheraz@demo.com", job_title: "UI/UX Designer", hourly_rate: 55, skills: ["Figma", "UI/UX Design", "Prototyping"] },
    { full_name: "Hamza", email: "hamza@demo.com", job_title: "DevOps Engineer", hourly_rate: 80, skills: ["AWS", "Docker", "CI/CD", "Security"] },
    { full_name: "Ali", email: "ali@demo.com", job_title: "QA Specialist", hourly_rate: 45, skills: ["QA Testing", "Cypress", "Automation"] },
  ];

  const { error } = await supabase
    .from("team_resources")
    .insert(
      dummyWorkers.map(w => ({
        workspace_id: workspaceId,
        ...w
      }))
    );

  if (error) console.error("Error generating team:", error);
  revalidatePath("/dashboard/team");
}