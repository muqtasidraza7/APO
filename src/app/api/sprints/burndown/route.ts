import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get("sprintId");

    if (!sprintId) {
      return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
    }

    // 1. Fetch Sprint Details
    const { data: sprint, error: sprintError } = await supabase
      .from("sprints")
      .select("*")
      .eq("id", sprintId)
      .single();

    if (sprintError || !sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // 2. Fetch all tasks for this sprint
    const { data: tasks, error: tasksError } = await supabase
      .from("sprint_tasks")
      .select("story_points, status, completed_at")
      .eq("sprint_id", sprintId);

    if (tasksError) throw tasksError;

    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    
    const chartData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < durationDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      // Ideal Burndown: Linear decrease from totalPoints to 0
      const idealRemaining = totalPoints - (totalPoints / (durationDays - 1)) * i;

      // Actual Burndown: Total points minus points of tasks completed BEFORE or ON this date
      let actualRemaining: number | null = totalPoints;
      if (currentDate <= today) {
        const completedPoints = tasks
          .filter(t => t.status === "done" && t.completed_at && new Date(t.completed_at) <= new Date(currentDate.getTime() + 86400000)) // Include end of day
          .reduce((sum, t) => sum + (t.story_points || 0), 0);
        actualRemaining = totalPoints - completedPoints;
      } else {
        actualRemaining = null; // No data for future dates
      }

      chartData.push({
        day: i,
        date: currentDate.toISOString().split('T')[0],
        ideal: Math.max(0, Math.round(idealRemaining * 10) / 10),
        actual: actualRemaining !== null ? Math.max(0, actualRemaining) : null,
      });
    }

    return NextResponse.json({
      success: true,
      totalPoints,
      chartData,
      sprintName: sprint.name
    });

  } catch (error: any) {
    console.error("Burndown API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
