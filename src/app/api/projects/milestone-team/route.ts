import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, milestoneTitle, memberIds } = await request.json();
  if (!projectId || !milestoneTitle) {
    return NextResponse.json({ error: "projectId and milestoneTitle required" }, { status: 400 });
  }

  // Use admin client for DB operations to bypass RLS
  const admin = createAdminClient();

  const { data: project, error: fetchError } = await admin
    .from("projects")
    .select("ai_data, workspace_id")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify user belongs to this workspace
  const { data: membership } = await admin
    .from("team_members")
    .select("id")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", user.id)
    .single();

  const { data: workspace } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", project.workspace_id)
    .single();

  if (!membership && workspace?.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const milestones: any[] = project.ai_data?.milestones || [];

  if (milestones.length === 0) {
    return NextResponse.json({ error: "No milestones found in project" }, { status: 404 });
  }

  // Find milestone by normalized title comparison
  const normalizedTarget = milestoneTitle.trim().toLowerCase();
  const matchIdx = milestones.findIndex(
    (m: any) => (m.title || "").trim().toLowerCase() === normalizedTarget
  );

  if (matchIdx === -1) {
    return NextResponse.json(
      { error: `Milestone "${milestoneTitle}" not found in project plan` },
      { status: 404 }
    );
  }

  const updatedMilestones = milestones.map((m: any, idx: number) =>
    idx === matchIdx ? { ...m, assigned_member_ids: memberIds || [] } : m
  );

  const { data: updated, error: updateError } = await admin
    .from("projects")
    .update({ ai_data: { ...project.ai_data, milestones: updatedMilestones } })
    .eq("id", projectId)
    .select("id");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Update failed — no rows modified" }, { status: 500 });
  }

  return NextResponse.json({ success: true, memberIds });
}
