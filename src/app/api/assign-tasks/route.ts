import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { createAdminClient } from "../../utils/supabase/admin";
import { getGroqModel } from "../../utils/ai";
import { taskAssignmentsArraySchema } from "../../utils/schemas";
import { PromptTemplate } from "@langchain/core/prompts";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { projectId, workspaceId } = await request.json();
        if (!projectId || !workspaceId) {
            return NextResponse.json({ error: "Missing projectId or workspaceId" }, { status: 400 });
        }

        // PM/owner check
        const [{ data: ws }, { data: callerMember }] = await Promise.all([
            supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single(),
            supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspaceId).maybeSingle(),
        ]);
        if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
            return NextResponse.json({ error: "Only owners and PMs can run AI task assignment" }, { status: 403 });
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
        const admin = createAdminClient();

        // Fetch team members, patterns, sprint task history, and all projects in parallel
        const [
            { data: teamMembers },
            { data: patterns },
            { data: allSprintTasks },
            { data: allProjects },
        ] = await Promise.all([
            admin
                .from("team_members")
                .select("id, full_name, job_title, skills, capacity_hours_per_week, status, performance_score")
                .eq("workspace_id", effectiveWorkspaceId),
            admin
                .from("worker_patterns")
                .select("*")
                .eq("workspace_id", effectiveWorkspaceId)
                .eq("resolved", false),
            // All sprint tasks in the workspace for completion rate calculation
            admin
                .from("sprint_tasks")
                .select("assigned_to, status")
                .eq("workspace_id", effectiveWorkspaceId),
            // All projects for milestone completion tracking
            admin
                .from("projects")
                .select("ai_data")
                .eq("workspace_id", effectiveWorkspaceId),
        ]);

        if (!teamMembers || teamMembers.length === 0) {
            return NextResponse.json({ error: "No team members found in this workspace. Add team members first." }, { status: 404 });
        }

        // Compute sprint task completion rate per member
        const sprintStats: Record<string, { assigned: number; done: number }> = {};
        for (const task of allSprintTasks || []) {
            if (!task.assigned_to) continue;
            if (!sprintStats[task.assigned_to]) sprintStats[task.assigned_to] = { assigned: 0, done: 0 };
            sprintStats[task.assigned_to].assigned++;
            if (task.status === "done") sprintStats[task.assigned_to].done++;
        }

        // Compute milestone completion rate per member from ai_data across all projects
        const msStats: Record<string, { total: number; completed: number }> = {};
        for (const p of allProjects || []) {
            for (const ms of (p.ai_data?.milestones || [])) {
                for (const memberId of (ms.assigned_member_ids || [])) {
                    if (!msStats[memberId]) msStats[memberId] = { total: 0, completed: 0 };
                    msStats[memberId].total++;
                    if (ms.status === "completed") msStats[memberId].completed++;
                }
            }
        }

        // Build member lookup for names
        const memberMap: Record<string, string> = {};
        for (const m of teamMembers) {
            memberMap[m.id] = m.full_name || m.job_title || "Team Member";
        }

        // Separate patterns by type for the prompt
        const taskPatterns = (patterns || [])
            .filter((p: any) => p.pattern_type === "task_incompatibility")
            .map((p: any) => ({
                worker: memberMap[p.member_id] || p.member_id,
                task_type: p.task_type || "General",
                reason: p.reason,
                severity: p.severity,
            }));

        const groupPatterns = (patterns || [])
            .filter((p: any) => p.pattern_type === "group_conflict")
            .map((p: any) => ({
                worker_a: memberMap[p.member_id_a] || p.member_id_a,
                worker_b: memberMap[p.member_id_b] || p.member_id_b,
                reason: p.reason,
                severity: p.severity,
            }));

        const collabPatterns = (patterns || [])
            .filter((p: any) => p.pattern_type === "collaboration_positive")
            .map((p: any) => ({
                worker_a: memberMap[p.member_id_a] || p.member_id_a,
                worker_b: memberMap[p.member_id_b] || p.member_id_b,
                reason: p.reason,
            }));

        const perfPatterns = (patterns || [])
            .filter((p: any) => p.pattern_type === "performance_insight")
            .map((p: any) => ({
                worker: memberMap[p.member_id] || p.member_id,
                reason: p.reason,
                severity: p.severity,
            }));

        const milestonesJson = JSON.stringify(
            milestones.map((m: any) => ({ title: m.title, week: m.week, deliverable: m.deliverable }))
        );

        // Build enriched team JSON with real completion history
        const teamJson = JSON.stringify(
            teamMembers.map((m: any) => {
                const sp = sprintStats[m.id];
                const ms = msStats[m.id];
                const sprintRate = sp && sp.assigned > 0
                    ? `${Math.round((sp.done / sp.assigned) * 100)}% (${sp.done}/${sp.assigned} tasks done)`
                    : "No sprint history";
                const msRate = ms && ms.total > 0
                    ? `${Math.round((ms.completed / ms.total) * 100)}% (${ms.completed}/${ms.total} milestones completed)`
                    : "No milestone history";

                return {
                    id: m.id,
                    name: m.full_name || m.job_title || "Team Member",
                    role: m.job_title || "Team Member",
                    skills: m.skills || [],
                    capacity_hours_per_week: m.capacity_hours_per_week || 40,
                    performance_score: m.performance_score ?? 100,
                    sprint_completion_rate: sprintRate,
                    milestone_completion_rate: msRate,
                };
            })
        );

        const patternsSection = [
            taskPatterns.length > 0 ? `TASK INCOMPATIBILITIES (avoid these):\n${JSON.stringify(taskPatterns, null, 2)}` : "",
            groupPatterns.length > 0 ? `GROUP CONFLICTS (avoid pairing):\n${JSON.stringify(groupPatterns, null, 2)}` : "",
            collabPatterns.length > 0 ? `PROVEN COLLABORATIONS (prefer these pairings):\n${JSON.stringify(collabPatterns, null, 2)}` : "",
            perfPatterns.length > 0 ? `PERFORMANCE INSIGHTS:\n${JSON.stringify(perfPatterns, null, 2)}` : "",
        ].filter(Boolean).join("\n\n") || "No patterns recorded — assign freely based on skills and completion history.";

        const model = getGroqModel(0.2);
        const structuredModel = model.withStructuredOutput(taskAssignmentsArraySchema);

        const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Project Manager AI. Assign the following PROJECT MILESTONES to the most suitable TEAM MEMBERS.

ASSIGNMENT PRIORITY (in order):
1. Skill match — does the member's skills/role fit the milestone deliverable?
2. Sprint completion rate — members who complete more of their tasks are more reliable
3. Milestone completion rate — members who deliver milestones successfully get priority for new ones
4. Performance score — higher score = fewer behavioral issues (max 100)
5. Pattern memory — respect incompatibilities (BLOCKER > CAUTION), favor proven collaborations
6. Distribute work fairly — do not assign everything to one person

RULES:
- Each milestone requires 1 to 5 team members — choose the right number based on scope
- Assign MULTIPLE members when:
  a. The deliverable spans multiple skill areas (e.g., frontend + backend for a full feature)
  b. The week duration and effort clearly warrant parallel work
  c. Two or more members share complementary or overlapping skills and both can contribute
  d. A proven collaboration pair exists — prefer them together
- Assign a SOLO member when:
  a. The milestone is narrow/focused (e.g., "Write API docs", "Set up CI/CD")
  b. The team is small relative to the number of milestones — don't stretch coverage thin
  c. No other member has relevant skills for that milestone
- Use ONLY the IDs provided in the team list
- NEVER assign two members who have a BLOCKER group_conflict to the same milestone
- NEVER assign a member to a task if a BLOCKER task_incompatibility pattern exists for them
- For CAUTION patterns, you may assign but mention it in reasoning
- No single member should appear in more than 40% of all milestone assignments
- Prefer members with higher sprint_completion_rate for critical milestones
- If sprint_completion_rate is "No sprint history", rely on skills and performance_score

PROJECT: "{projectName}"

MILESTONES:
{milestones}

TEAM MEMBERS (skills + real completion history + performance score):
{teamMembers}

BEHAVIORAL PATTERN MEMORY:
{patterns}
`);

        const prompt = await promptTemplate.invoke({
            projectName: project.name,
            milestones: milestonesJson,
            teamMembers: teamJson,
            patterns: patternsSection,
        });

        const assignments = await structuredModel.invoke(prompt);

        const validIds = new Set(teamMembers.map((m: any) => m.id));
        const valid = assignments
            .map((a: any) => ({
                ...a,
                assigned_to: (a.assigned_to as string[]).filter((id) => validIds.has(id)),
            }))
            .filter((a: any) => a.assigned_to.length > 0);

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
