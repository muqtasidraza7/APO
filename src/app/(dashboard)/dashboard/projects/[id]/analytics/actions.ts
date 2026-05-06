"use server";

import { createClient } from "../../../../../utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProjectBudget(projectId: string, newBudget: number) {
    const supabase = await createClient();

    // Fetch existing ai_data
    const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("ai_data")
        .eq("id", projectId)
        .single();

    if (fetchError || !project) {
        return { error: "Project not found" };
    }

    const aiData = project.ai_data || {};
    aiData.budget_estimate = newBudget;

    // Update with new budget
    const { error: updateError } = await supabase
        .from("projects")
        .update({ ai_data: aiData })
        .eq("id", projectId);

    if (updateError) {
        return { error: "Failed to update budget" };
    }

    revalidatePath(`/dashboard/projects/${projectId}/analytics`);
    return { success: true };
}
