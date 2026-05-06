import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get("project_id");

        if (!projectId) {
            return NextResponse.json({ error: "project_id is required" }, { status: 400 });
        }

        // 1. Fetch Project for budget
        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("name, ai_data")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const budgetEstimate = project.ai_data?.budget_estimate || 0;
        const currency = project.ai_data?.currency || "USD";
        
        // 2. Fetch Assignments with Resource info
        const { data: assignments, error: assignmentsError } = await supabase
            .from("project_assignments")
            .select(`
                id,
                task_name,
                week_number,
                status,
                resource:team_members(id, job_title, hourly_rate)
            `)
            .eq("project_id", projectId);

        if (assignmentsError) {
            return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
        }

        // 3. Calculate Burn Rate
        // Assume an average of 20 hours per milestone for calculation if no exact hours provided
        // Real logic would extract from ai_data.tasks if available.
        let totalCalculatedCost = 0;
        let actualSpentCost = 0; // Cost of completed tasks
        const costByWeek: Record<number, number> = {};
        const costByMember: Record<string, { name: string, cost: number, hours: number }> = {};

        assignments?.forEach((assignment: any) => {
            const rate = assignment.resource?.hourly_rate || 50; // Default to $50/hr if rate is missing
            // Trying to find estimated hours from AI data if possible, default to 20h per milestone/week
            let estimatedHours = 20; 
            
            // Check if tasks exist in ai_data and match name
            const aiTask = project.ai_data?.tasks?.find((t: any) => t.title === assignment.task_name);
            if (aiTask && aiTask.estimated_hours) {
                estimatedHours = aiTask.estimated_hours;
            }

            const taskCost = rate * estimatedHours;
            totalCalculatedCost += taskCost;

            if (assignment.status === "completed") {
                actualSpentCost += taskCost;
            }

            // Group by week
            const week = assignment.week_number;
            if (!costByWeek[week]) costByWeek[week] = 0;
            costByWeek[week] += taskCost;

            // Group by member
            const memberId = assignment.resource?.id;
            if (memberId) {
                if (!costByMember[memberId]) {
                    costByMember[memberId] = { name: assignment.resource.job_title || "Team Member", cost: 0, hours: 0 };
                }
                costByMember[memberId].cost += taskCost;
                costByMember[memberId].hours += estimatedHours;
            }
        });

        // Convert grouped objects to arrays for the charts
        const weeklyBurnChart = Object.keys(costByWeek).map(week => ({
            week: parseInt(week),
            cost: costByWeek[parseInt(week)]
        })).sort((a, b) => a.week - b.week);

        const resourceCostChart = Object.values(costByMember).sort((a, b) => b.cost - a.cost);

        return NextResponse.json({
            budgetEstimate,
            currency,
            totalCalculatedCost,
            actualSpentCost,
            variance: budgetEstimate - totalCalculatedCost,
            weeklyBurnChart,
            resourceCostChart
        });
        
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
