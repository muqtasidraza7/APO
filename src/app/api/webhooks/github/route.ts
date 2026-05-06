import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        
        // Only process pull_request events that are closed and merged
        if (payload.action === "closed" && payload.pull_request?.merged) {
            const pr = payload.pull_request;
            const bodyText = pr.body || "";
            const titleText = pr.title || "";
            
            // Look for "Closes [Task Name]" or "Fixes [Task Name]"
            const closeRegex = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+(?:task-)?([a-zA-Z0-9\s-]+)/i;
            
            const match = bodyText.match(closeRegex) || titleText.match(closeRegex);
            
            if (match && match[1]) {
                const taskNameRaw = match[1].trim();
                
                const supabase = await createClient();
                
                // Find an active assignment that closely matches the task name
                const { data: assignments, error: searchError } = await supabase
                    .from("project_assignments")
                    .select("id, project_id, task_name, resource_id")
                    .ilike("task_name", `%${taskNameRaw}%`)
                    .neq("status", "completed");
                    
                if (!searchError && assignments && assignments.length > 0) {
                    const assignment = assignments[0]; // Take the first matched active task
                    
                    // Mark as completed
                    await supabase
                        .from("project_assignments")
                        .update({ status: "completed" })
                        .eq("id", assignment.id);
                        
                    // Log activity
                    await supabase.from("team_activity").insert({
                        // Note: ideally we would find workspace_id from project_id, but skipping for brevity in webhook
                        entity_type: "milestone",
                        entity_id: assignment.project_id,
                        activity_type: "task_completed",
                        description: `Automatically closed via GitHub PR #${pr.number}: ${pr.title}`,
                        team_member_id: assignment.resource_id,
                        metadata: {
                            pr_url: pr.html_url,
                            pr_number: pr.number,
                            task_name: assignment.task_name,
                            source: "github_integration"
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("GitHub Webhook Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
