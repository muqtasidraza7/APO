"use server";

// CHANGE THIS LINE:
import { createClient } from "../utils/supabase/server"; 
import { redirect } from "next/navigation";

export async function createWorkspace(workspaceName: string) {
  // Add 'await' if your createClient is async, or remove it if it's synchronous. 
  // Based on my previous code, it is likely async:
  const supabase = await createClient();

  // 1. Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be logged in" };
  }

  // 2. Create the Workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName,
      owner_id: user.id,
    })
    .select()
    .single();

  if (wsError) {
    console.error("Workspace Error:", wsError.message); // Log the specific message
    return { error: `Failed to create workspace: ${wsError.message}` };
  }

  // 3. Add the creator as the 'PM' member
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

  // 4. Redirect to Dashboard
  redirect("/dashboard");
}