import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sprintId, retrospective_notes } = await request.json();
    if (!sprintId) return NextResponse.json({ error: "sprintId required" }, { status: 400 });

    const { data: sprint, error } = await supabase
      .from("sprints")
      .update({ status: "completed", retrospective_notes: retrospective_notes || null })
      .eq("id", sprintId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, sprint });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
