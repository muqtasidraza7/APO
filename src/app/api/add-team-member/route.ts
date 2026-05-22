import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../utils/supabase/server";
import { createAdminClient } from "../../utils/supabase/admin";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { workspace_id, user_id, full_name, job_title, skills, capacity_hours_per_week, hourly_rate, role } = body;

        if (!workspace_id || !user_id) {
            return NextResponse.json({ error: "workspace_id and user_id are required" }, { status: 400 });
        }
        if (!full_name?.trim()) {
            return NextResponse.json({ error: "full_name is required" }, { status: 400 });
        }

        // Caller must be owner or PM
        const [{ data: ws }, { data: callerMember }] = await Promise.all([
            supabase.from("workspaces").select("owner_id").eq("id", workspace_id).single(),
            supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspace_id).maybeSingle(),
        ]);
        if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
            return NextResponse.json({ error: "Only owners and PMs can add team members" }, { status: 403 });
        }

        const assignedRole: string = role === "pm" ? "pm" : "member";

        const { data: workspaceMember, error: memberError } = await adminSupabase
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

        // Update role in workspace_members to reflect what PM chose
        await adminSupabase
            .from("workspace_members")
            .update({ role: assignedRole })
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id);

        const { data: existing } = await adminSupabase
            .from("team_members")
            .select("id")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .single();

        if (existing) {
            return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
        }

        const { data: newMember, error: insertError } = await adminSupabase
            .from("team_members")
            .insert({
                workspace_id,
                user_id,
                full_name: full_name.trim(),
                job_title: job_title || null,
                skills: skills || [],
                capacity_hours_per_week: capacity_hours_per_week || 40,
                hourly_rate: hourly_rate || null,
                status: "offline",
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
        }

        await adminSupabase.from("team_activity").insert({
            workspace_id,
            user_id,
            team_member_id: newMember.id,
            activity_type: "joined_team",
            entity_type: "team",
            entity_id: newMember.id,
            description: `${full_name.trim()} joined the team`,
            metadata: {},
        });

        return NextResponse.json({ success: true, member: newMember });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const adminSupabase = createAdminClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const workspace_id = searchParams.get("workspace_id");

        if (!workspace_id) {
            return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
        }

        // Caller must be owner or PM
        const [{ data: ws }, { data: callerMember }] = await Promise.all([
            supabase.from("workspaces").select("owner_id").eq("id", workspace_id).single(),
            supabase.from("workspace_members").select("role").eq("user_id", user.id).eq("workspace_id", workspace_id).maybeSingle(),
        ]);
        if (ws?.owner_id !== user.id && callerMember?.role !== "pm") {
            return NextResponse.json({ error: "Only owners and PMs can view available members" }, { status: 403 });
        }

        const { data: workspaceMembers, error: wmError } = await adminSupabase
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspace_id);

        if (wmError || !workspaceMembers) {
            return NextResponse.json({ error: "Failed to fetch workspace members" }, { status: 500 });
        }

        const { data: teamMembers } = await adminSupabase
            .from("team_members")
            .select("user_id")
            .eq("workspace_id", workspace_id);

        const teamMemberUserIds = new Set((teamMembers || []).map(m => m.user_id));

        const availableUserIds = workspaceMembers
            .map(m => m.user_id)
            .filter(uid => !teamMemberUserIds.has(uid));

        // Fetch real names + emails from auth
        const { data: authData } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
        const userMap = new Map((authData?.users || []).map(u => [
            u.id,
            {
                email: u.email || "",
                full_name: (u.user_metadata?.full_name || u.user_metadata?.name || "").trim(),
            },
        ]));

        const available_users = availableUserIds.map((uid: string) => {
            const info = userMap.get(uid) || { email: "", full_name: "" };
            return { user_id: uid, email: info.email, full_name: info.full_name };
        });

        return NextResponse.json({ available_users });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
