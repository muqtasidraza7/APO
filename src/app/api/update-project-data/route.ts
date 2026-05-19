import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { projectId, name, ai_data, client_info, success_criteria, custom_fields } = body;

    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    // Fetch project for RBAC check
    const { data: project } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", project.workspace_id)
      .single();

    const { data: wsMember } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", project.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = ws?.owner_id === user.id || wsMember?.role === "pm";

    if (!isAdmin) {
      return NextResponse.json({ error: "Only Project Managers can edit blueprints" }, { status: 403 });
    }

    // Fetch current project to merge ai_data (preserve runtime fields like status, assigned_member_ids)
    const { data: current } = await supabase
      .from("projects")
      .select("ai_data")
      .eq("id", projectId)
      .single();

    // Build merged ai_data: start from current, overlay incoming changes
    // For milestones we do a title-keyed merge to preserve status/completion/assigned_member_ids
    const currentAiData = current?.ai_data || {};
    const incomingAiData = ai_data || {};

    let mergedMilestones = incomingAiData.milestones;
    if (Array.isArray(mergedMilestones) && Array.isArray(currentAiData.milestones)) {
      const existingByTitle: Record<string, any> = {};
      for (const m of currentAiData.milestones) {
        existingByTitle[m.title] = m;
      }
      mergedMilestones = mergedMilestones.map((incoming: any) => {
        const existing = existingByTitle[incoming.title];
        if (existing) {
          // Keep runtime fields, overlay editable content fields
          return {
            ...existing,
            title: incoming.title,
            week: incoming.week,
            deliverable: incoming.deliverable,
            success_criteria: incoming.success_criteria,
          };
        }
        return incoming;
      });
    }

    const mergedAiData = {
      ...currentAiData,
      ...incomingAiData,
      ...(mergedMilestones !== undefined ? { milestones: mergedMilestones } : {}),
    };

    const updatePayload: Record<string, any> = { ai_data: mergedAiData };
    if (name !== undefined)             updatePayload.name = name;
    if (client_info !== undefined)      updatePayload.client_info = client_info;
    if (success_criteria !== undefined) updatePayload.success_criteria = success_criteria;
    if (custom_fields !== undefined)    updatePayload.custom_fields = custom_fields;

    const { error: updateError } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", projectId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("update-project-data error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
