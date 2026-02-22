

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { workspace_id, user_id, job_title, skills, capacity_hours_per_week, hourly_rate } = body;

        if (!workspace_id || !user_id) {
            return NextResponse.json({ error: "workspace_id and user_id are required" }, { status: 400 });
        }

        const { data: workspaceMember, error: memberError } = await supabase
            .from("workspace_members")
            .select("*")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .single();

        if (memberError || !workspaceMember) {
            return NextResponse.json(
                { error: "User is not a member of this workspace" },
                { status: 403 }
            );
        }

        const { data: existing } = await supabase
            .from("team_members")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .single();

        if (existing) {
            return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
        }

        const { data: newMember, error: insertError } = await supabase
            .from("team_members")
            .insert({
                workspace_id,
                user_id,
                job_title: job_title || null,
                skills: skills || [],
                capacity_hours_per_week: capacity_hours_per_week || 40,
                hourly_rate: hourly_rate || null,
                status: "offline",
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert error:", insertError);
            return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
        }

        await supabase.from("team_activity").insert({
            workspace_id,
            user_id,
            team_member_id: newMember.id,
            activity_type: "joined_team",
            entity_type: "team",
            entity_id: newMember.id,
            description: `${job_title || "New member"} joined the team`,
            metadata: {},
        });

        return NextResponse.json({ success: true, member: newMember });
    } catch (error: any) {
        console.error("Add team member error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const workspace_id = searchParams.get("workspace_id");

        if (!workspace_id) {
            return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
        }

        const { data: workspaceMembers, error: wmError } = await supabase
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspace_id);

        if (wmError || !workspaceMembers) {
            return NextResponse.json({ error: "Failed to fetch workspace members" }, { status: 500 });
        }

        const { data: teamMembers } = await supabase
            .from("team_members")
            .select("user_id")
            .eq("workspace_id", workspace_id);

        const teamMemberUserIds = new Set((teamMembers || []).map(m => m.user_id));

        const availableUserIds = workspaceMembers
            .map(m => m.user_id)
            .filter(uid => !teamMemberUserIds.has(uid));

        return NextResponse.json({ available_user_ids: availableUserIds });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
