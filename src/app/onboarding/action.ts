"use server";

import { createClient } from "../utils/supabase/server"; 
import { redirect } from "next/navigation";

export async function createWorkspace(workspaceName: string) {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be logged in" };
  }

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName,
      owner_id: user.id,
    })
    .select()
    .single();

  if (wsError) {
    console.error("Workspace Error:", wsError.message); 
    return { error: `Failed to create workspace: ${wsError.message}` };
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'PM',
    });

  if (memberError) {
    console.error("Member Error:", memberError.message);
    return { error: "Failed to join workspace" };
  }

  redirect("/dashboard");
}