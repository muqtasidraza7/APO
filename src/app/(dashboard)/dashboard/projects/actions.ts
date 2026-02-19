"use server";

import { createClient } from "../../../utils/supabase/server";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in" };

  // 2. Extract Data
  const file = formData.get("file") as File;
  const projectName = formData.get("projectName") as string;
  const workspaceId = formData.get("workspaceId") as string;

  console.log("Starting Upload for:", projectName); // DEBUG

  if (!file || !projectName || !workspaceId) {
    return { error: "Missing required fields" };
  }

  // 3. Upload File
  const filePath = `${workspaceId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload Error:", uploadError);
    return { error: `Upload Failed: ${uploadError.message}` };
  }

  // 4. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from("project-files")
    .getPublicUrl(filePath);

  // 5. Create Project Record
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
    console.error("Database Insert Error:", dbError); // This will show in your terminal now
    return { error: `DB Save Failed: ${dbError.message}` };
  }

  if (!project) {
    console.error("Project is null after insert");
    return { error: "Project creation failed silently" };
  }

  console.log("Project Created Successfully:", project.id); // DEBUG

  // 6. Redirect ONLY if successful
  redirect(`/dashboard/projects/${project.id}`);
}