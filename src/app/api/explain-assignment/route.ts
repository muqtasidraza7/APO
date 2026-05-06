import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { getGroqModel } from "../../utils/ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { question, workspaceId } = await request.json();

        if (!question || !workspaceId) {
            return NextResponse.json({ error: "question and workspaceId are required" }, { status: 400 });
        }

        // Fetch all unresolved patterns for this workspace
        const { data: patterns } = await supabase
            .from("worker_patterns")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("resolved", false)
            .order("created_at", { ascending: false });

        // Fetch all team members for name lookup
        const { data: teamMembers } = await supabase
            .from("team_members")
            .select("id, job_title, skills, performance_score")
            .eq("workspace_id", workspaceId);

        // Fetch recent task assignments for context
        const { data: recentActivity } = await supabase
            .from("team_activity")
            .select("team_member_id, description, metadata, created_at")
            .eq("workspace_id", workspaceId)
            .eq("activity_type", "task_assigned")
            .order("created_at", { ascending: false })
            .limit(50);

        // Build member lookup map
        const memberMap: Record<string, string> = {};
        for (const m of teamMembers || []) {
            memberMap[m.id] = m.job_title || "Team Member";
        }

        // Enrich patterns with member names
        const enrichedPatterns = (patterns || []).map((p: any) => {
            if (p.pattern_type === "task_incompatibility") {
                return {
                    type: "Worker-Task Incompatibility",
                    worker: memberMap[p.member_id] || p.member_id,
                    task_type: p.task_type || "General Tasks",
                    task_title: p.task_title || null,
                    reason: p.reason,
                    severity: p.severity,
                    date: new Date(p.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }),
                };
            } else if (p.pattern_type === "group_conflict") {
                return {
                    type: "Group Conflict",
                    worker_a: memberMap[p.member_id_a] || p.member_id_a,
                    worker_b: memberMap[p.member_id_b] || p.member_id_b,
                    reason: p.reason,
                    severity: p.severity,
                    date: new Date(p.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }),
                };
            }
            return p;
        });

        const enrichedMembers = (teamMembers || []).map((m: any) => ({
            name: m.job_title || "Team Member",
            skills: m.skills || [],
            performance_score: m.performance_score ?? 100,
        }));

        const model = getGroqModel(0.3);
        const parser = new StringOutputParser();

        const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert Project Manager AI with access to a team's full pattern memory — a history of incidents, incompatibilities, and behavioral observations about team members.

A Project Manager is asking you the following question:
"{question}"

Use the data below to give a detailed, helpful, and honest answer. Always reference specific patterns by date and reason when they are relevant. Speak directly and professionally.

TEAM MEMBERS:
{members}

RECORDED PATTERNS (Incompatibilities & Conflicts):
{patterns}

RECENT TASK ASSIGNMENTS (last 50):
{activity}

Answer the project manager's question. If the question is about why someone was not assigned, explain using the patterns above. If there are no relevant patterns, say so honestly. Always be specific about dates and reasons.
`);

        const patternsStr = enrichedPatterns.length > 0
            ? JSON.stringify(enrichedPatterns, null, 2)
            : "No patterns recorded yet for this workspace.";

        const activityStr = JSON.stringify(
            (recentActivity || []).map((a: any) => ({
                worker: memberMap[a.team_member_id] || a.team_member_id,
                task: a.metadata?.task_title || a.description,
                project: a.metadata?.project_name || "Unknown",
                status: a.metadata?.status || "active",
                date: new Date(a.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }),
            })),
            null, 2
        );

        const prompt = await promptTemplate.invoke({
            question,
            members: JSON.stringify(enrichedMembers, null, 2),
            patterns: patternsStr,
            activity: activityStr,
        });

        const answer = await model.pipe(parser).invoke(prompt);

        return NextResponse.json({ success: true, answer });
    } catch (error: any) {
        console.error("Explain assignment error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
