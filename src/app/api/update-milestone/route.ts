

import { createClient } from "../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        const { milestoneId, projectId, updates } = body;

        if (!milestoneId || !projectId) {
            return NextResponse.json(
                { error: "Missing milestoneId or projectId" },
                { status: 400 }
            );
        }

        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("id, owner_id")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get workspace_id from the project to check role
        const { data: projectFull } = await supabase.from("projects").select("workspace_id").eq("id", projectId).single();
        if (projectFull) {
            const [{ data: ws }, { data: callerMember }] = await Promise.all([
                supabase.from("workspaces").select("owner_id").eq("id", projectFull.workspace_id).single(),
                supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", projectFull.workspace_id).maybeSingle(),
            ]);
            if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
                return NextResponse.json({ error: "Only owners and PMs can update milestones" }, { status: 403 });
            }
        }

        const updateData: any = { ...updates };

        if (updates.status === 'completed') {
            updateData.completed_at = new Date().toISOString();
            updateData.completed_by = user.id;
            updateData.completion_percentage = 100;
        } else if (updates.status === 'in_progress') {
            updateData.completion_percentage = updateData.completion_percentage || 50;
        } else if (updates.status === 'pending') {
            updateData.completed_at = null;
            updateData.completed_by = null;
            updateData.completion_percentage = 0;
        }

        const { data: currentProject } = await supabase
            .from("projects")
            .select("ai_data")
            .eq("id", projectId)
            .single();

        if (currentProject?.ai_data?.milestones) {
            let currentMilestoneTitle = "";

            // milestoneId is the milestone title (AI milestones lack a stable .id)
            const milestones = currentProject.ai_data.milestones.map((m: any) => {
                const key = m.title || m.task_name || m.id;
                if (key === milestoneId) {
                    currentMilestoneTitle = key;
                    return { ...m, ...updateData };
                }
                return m;
            });

            const { error: updateError } = await supabase
                .from("projects")
                .update({
                    ai_data: {
                        ...currentProject.ai_data,
                        milestones
                    }
                })
                .eq("id", projectId);

            if (updateError) {
                console.error("Update error:", updateError);
                return NextResponse.json(
                    { error: "Failed to update milestone" },
                    { status: 500 }
                );
            }

            // Sync with Roadmap Assignments
            if (currentMilestoneTitle && updates.status) {
                await supabase
                    .from("project_assignments")
                    .update({ status: updates.status })
                    .eq("project_id", projectId)
                    .eq("task_name", currentMilestoneTitle);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Milestone updated successfully"
        });

    } catch (error: any) {
        console.error("Error updating milestone:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
