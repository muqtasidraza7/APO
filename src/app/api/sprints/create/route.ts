import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId, workspaceId, name, goal, start_date, end_date } = await request.json();

    if (!projectId || !workspaceId || !name || !start_date || !end_date) {
      return NextResponse.json({ error: "Missing required fields: name, start_date, end_date" }, { status: 400 });
    }

    // Verify user belongs to this workspace
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: sprint, error } = await supabase
      .from("sprints")
      .insert({ project_id: projectId, workspace_id: workspaceId, name, goal: goal || null, start_date, end_date, status: "planning" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, sprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
