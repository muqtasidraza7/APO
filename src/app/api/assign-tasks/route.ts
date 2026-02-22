

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import Groq from "groq-sdk";

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
        const { data: teamMembers, error: teamError } = await supabase
            .from("team_members")
            .select("id, job_title, skills, capacity_hours_per_week, status, hourly_rate")
            .eq("workspace_id", effectiveWorkspaceId);

        if (teamError) {
            return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
        }

        if (!teamMembers || teamMembers.length === 0) {
            return NextResponse.json({ error: "No team members found in this workspace. Add team members first." }, { status: 404 });
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
            }))
        );

        const prompt = `
You are an expert Project Manager AI. Assign the following PROJECT MILESTONES to the most suitable TEAM MEMBERS.

RULES:
1. Match based on skills and role relevance
2. Distribute work fairly — do not assign everything to one person
3. Each milestone needs exactly ONE assignee
4. Use ONLY the IDs provided in the team list
5. Return ONLY a JSON array, no extra text

PROJECT: "${project.name}"

MILESTONES:
${milestonesJson}

TEAM MEMBERS:
${teamJson}

Return this JSON structure:
[
  {
    "task_title": "Exact milestone title from list",
    "assigned_to": "team-member-uuid",
    "assigned_to_name": "Job title of the assigned person",
    "reasoning": "One sentence explanation"
  }
]
`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            response_format: { type: "json_object" },
        });

        const rawText = completion.choices[0].message.content || "{}";
        let assignments: any[] = [];

        try {
            const parsed = JSON.parse(rawText);
            
            assignments = Array.isArray(parsed)
                ? parsed
                : (parsed.assignments || parsed.results || parsed.data || []);
        } catch {
            return NextResponse.json({ error: "AI returned invalid JSON. Please try again." }, { status: 500 });
        }

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
