import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { getGroqModel } from "../../utils/ai";
import { taskAssignmentsArraySchema } from "../../utils/schemas";
import { PromptTemplate } from "@langchain/core/prompts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { projectId, workspaceId } = await request.json();

        if (!projectId || !workspaceId) {
            return NextResponse.json({ error: "Missing projectId or workspaceId" }, { status: 400 });
        }

        const { data: project, error: projectError } = await supabase
            .from("projects")
            .select("name, ai_data, workspace_id")
            .eq("id", projectId)
            .single();

        if (projectError || !project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const milestones: any[] = project.ai_data?.milestones || [];
        if (milestones.length === 0) {
            return NextResponse.json({ error: "No milestones found in this project. Please re-run AI analysis first." }, { status: 400 });
        }

        const effectiveWorkspaceId = project.workspace_id || workspaceId;

        // Fetch team members with performance score
        const { data: teamMembers, error: teamError } = await supabase
            .from("team_members")
            .select("id, job_title, skills, capacity_hours_per_week, status, hourly_rate, performance_score")
            .eq("workspace_id", effectiveWorkspaceId);

        if (teamError) {
            return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
        }

        if (!teamMembers || teamMembers.length === 0) {
            return NextResponse.json({ error: "No team members found in this workspace. Add team members first." }, { status: 404 });
        }

        // Fetch all unresolved patterns for this workspace
        const { data: patterns } = await supabase
            .from("worker_patterns")
            .select("*")
            .eq("workspace_id", effectiveWorkspaceId)
            .eq("resolved", false);

        // Build member lookup for names
        const memberMap: Record<string, string> = {};
        for (const m of teamMembers) {
            memberMap[m.id] = m.job_title || "Team Member";
        }

        // Separate patterns by type for the prompt
        const taskPatterns = (patterns || [])
            .filter((p: any) => p.pattern_type === "task_incompatibility")
            .map((p: any) => ({
                worker_id: p.member_id,
                worker_name: memberMap[p.member_id] || p.member_id,
                task_type: p.task_type || "General",
                task_title: p.task_title || null,
                reason: p.reason,
                severity: p.severity,
                date: new Date(p.created_at).toLocaleDateString("en-GB"),
            }));

        const groupPatterns = (patterns || [])
            .filter((p: any) => p.pattern_type === "group_conflict")
            .map((p: any) => ({
                worker_a_id: p.member_id_a,
                worker_b_id: p.member_id_b,
                worker_a_name: memberMap[p.member_id_a] || p.member_id_a,
                worker_b_name: memberMap[p.member_id_b] || p.member_id_b,
                reason: p.reason,
                severity: p.severity,
                date: new Date(p.created_at).toLocaleDateString("en-GB"),
            }));

        const milestonesJson = JSON.stringify(
            milestones.map((m: any) => ({ title: m.title, week: m.week, deliverable: m.deliverable }))
        );

        const teamJson = JSON.stringify(
            teamMembers.map(m => ({
                id: m.id,
                role: m.job_title || "Team Member",
                skills: m.skills || [],
                capacity_hours_per_week: m.capacity_hours_per_week || 40,
                status: m.status,
                performance_score: m.performance_score ?? 100,
            }))
        );

        const patternsSection = taskPatterns.length === 0 && groupPatterns.length === 0
            ? "No patterns recorded — assign freely based on skills."
            : `WORKER-TASK INCOMPATIBILITIES (avoid these combinations):
${JSON.stringify(taskPatterns, null, 2)}

GROUP CONFLICTS (do not co-assign these pairs to the same project):
${JSON.stringify(groupPatterns, null, 2)}`;

        // Initialize LangChain components
        const model = getGroqModel(0.2);
        const structuredModel = model.withStructuredOutput(taskAssignmentsArraySchema);

        const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Project Manager AI. Assign the following PROJECT MILESTONES to the most suitable TEAM MEMBERS.

RULES:
1. Match based on skills and role relevance
2. Distribute work fairly — do not assign everything to one person
3. Each milestone needs exactly ONE assignee
4. Use ONLY the IDs provided in the team list
5. CRITICAL: Do NOT assign a member to a task if a BLOCKER pattern exists for that worker-task combination
6. For CAUTION patterns, you may still assign but MUST mention the pattern in the reasoning
7. Prefer members with higher performance_score when skill match is equal
8. Do NOT co-assign two members with a BLOCKER group_conflict to the same project milestones

PROJECT: "{projectName}"

MILESTONES:
{milestones}

TEAM MEMBERS (with performance scores):
{teamMembers}

PATTERN MEMORY:
{patterns}
`);

        const prompt = await promptTemplate.invoke({
            projectName: project.name,
            milestones: milestonesJson,
            teamMembers: teamJson,
            patterns: patternsSection
        });

        // Generate assignments
        const assignments = await structuredModel.invoke(prompt);

        const validIds = new Set(teamMembers.map(m => m.id));
        const valid = assignments.filter((a: any) => validIds.has(a.assigned_to));

        if (valid.length === 0) {
            return NextResponse.json({ error: "AI could not match any milestones to team members. Please try again." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            assigned_count: valid.length,
            total_milestones: milestones.length,
            assignments: valid,
        });

    } catch (error: any) {
        console.error("AI assignment error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
