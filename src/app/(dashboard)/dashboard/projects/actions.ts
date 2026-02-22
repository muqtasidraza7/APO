"use server";

import { createClient } from "../../../utils/supabase/server";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  const file = formData.get("file") as File;
  const projectName = formData.get("projectName") as string;
  const workspaceId = formData.get("workspaceId") as string;

  console.log("Starting Upload for:", projectName); 

  if (!file || !projectName || !workspaceId) {
    return { error: "Missing required fields" };
  }

  const filePath = `${workspaceId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload Error:", uploadError);
    return { error: `Upload Failed: ${uploadError.message}` };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("project-files")
    .getPublicUrl(filePath);

  const { data: project, error: dbError } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      owner_id: user.id,
      name: projectName,
      original_file_url: publicUrl,
      ai_status: 'parsing',
    })
    .select()
    .single();

  if (dbError) {
    console.error("Database Insert Error:", dbError); 
    return { error: `DB Save Failed: ${dbError.message}` };
  }

  if (!project) {
    console.error("Project is null after insert");
    return { error: "Project creation failed silently" };
  }

  console.log("Project Created Successfully:", project.id); 

  redirect(`/dashboard/projects/${project.id}`);
}