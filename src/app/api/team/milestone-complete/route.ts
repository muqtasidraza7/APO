import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, milestoneTitle, memberId, completed } = await request.json();
  if (!projectId || !milestoneTitle || !memberId) {
    return NextResponse.json({ error: "projectId, milestoneTitle, memberId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the matching row (case-insensitive title match)
  const { data: rows, error: fetchErr } = await admin
    .from("project_assignments")
    .select("task_name")
    .eq("project_id", projectId)
    .eq("resource_id", memberId);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const normTarget = (milestoneTitle as string).trim().toLowerCase();
  const matchingTitle = (rows || []).find(
    (r) => (r.task_name || "").trim().toLowerCase() === normTarget
  )?.task_name;

  if (!matchingTitle) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("project_assignments")
    .update({
      manually_completed: completed,
      manually_completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("project_id", projectId)
    .eq("resource_id", memberId)
    .eq("task_name", matchingTitle);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
