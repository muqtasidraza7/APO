import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, actualHours } = await request.json();
    if (!taskId || actualHours === undefined || actualHours === null) {
      return NextResponse.json({ error: "taskId and actualHours required" }, { status: 400 });
    }

    const hours = parseFloat(actualHours);
    if (isNaN(hours) || hours < 0 || hours > 999) {
      return NextResponse.json({ error: "actualHours must be a number 0–999" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("sprint_tasks")
      .update({ actual_hours: hours === 0 ? null : hours })
      .eq("id", taskId)
      .select("id, actual_hours")
      .maybeSingle();

    if (error) throw error;
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true, actual_hours: task.actual_hours });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
