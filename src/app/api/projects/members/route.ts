import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, workspaceId } = await request.json();
  if (!projectId || !workspaceId) {
    return NextResponse.json({ error: "projectId and workspaceId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const [{ data: members, error }, { data: assignments }] = await Promise.all([
    admin
      .from("team_members")
      .select("id, full_name, job_title, user_id")
      .eq("workspace_id", workspaceId),
    admin
      .from("project_assignments")
      .select("task_name, resource_id")
      .eq("project_id", projectId),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    members: members || [],
    projectAssignments: assignments || [],
  });
}
