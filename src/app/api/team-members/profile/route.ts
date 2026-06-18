import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";

// Fields PM/Owner are allowed to change
const EDITABLE_FIELDS = new Set([
  "capacity_hours_per_week",
  "hourly_rate",
  "experience_level",
  "years_of_experience",
  "job_title",
  "skills",
]);

const FIELD_LABELS: Record<string, string> = {
  capacity_hours_per_week: "Capacity (hrs/wk)",
  hourly_rate:             "Hourly Rate",
  experience_level:        "Experience Level",
  years_of_experience:     "Years of Experience",
  job_title:               "Job Title",
  skills:                  "Skills",
};

// GET /api/team-members/profile?memberId=xxx
// Returns edit history for a team member
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: history } = await admin
      .from("team_member_edit_history")
      .select("id, field, old_value, new_value, changed_by_name, changed_at")
      .eq("member_id", memberId)
      .order("changed_at", { ascending: false })
      .limit(30);

    return NextResponse.json({ history: history || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/team-members/profile
// Body: { memberId, workspaceId, changes: Record<string, any> }
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { memberId, workspaceId, changes } = await request.json();
    if (!memberId || !workspaceId || !changes) {
      return NextResponse.json({ error: "memberId, workspaceId, changes required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Caller must be owner or pm
    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const { data: callerMember } = await admin
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const isOwner = ws?.owner_id === user.id;
    const callerRole = (callerMember?.role as string | null)?.toLowerCase();
    if (!isOwner && callerRole !== "pm") {
      return NextResponse.json({ error: "Only owners and PMs can edit member profiles" }, { status: 403 });
    }

    // Filter to only allowed fields
    const allowed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(changes)) {
      if (EDITABLE_FIELDS.has(key)) allowed[key] = val;
    }
    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
    }

    // Fetch current values for history diff
    const { data: current, error: fetchError } = await admin
      .from("team_members")
      .select(Array.from(EDITABLE_FIELDS).join(", "))
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!current) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Apply update
    const { error: updateError } = await admin
      .from("team_members")
      .update(allowed)
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Get caller's display name for history
    const { data: authData } = await admin.auth.admin.getUserById(user.id);
    const callerName = authData?.user?.user_metadata?.full_name || authData?.user?.email || "Unknown";

    // Insert one history row per changed field
    const historyRows = [];
    for (const [field, newVal] of Object.entries(allowed)) {
      const oldVal = (current as unknown as Record<string, unknown>)[field];
      const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal ?? "");
      const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal ?? "");
      if (oldStr === newStr) continue; // skip unchanged
      historyRows.push({
        member_id:       memberId,
        workspace_id:    workspaceId,
        changed_by:      user.id,
        changed_by_name: callerName,
        field:           FIELD_LABELS[field] || field,
        old_value:       oldStr,
        new_value:       newStr,
      });
    }

    if (historyRows.length > 0) {
      await admin.from("team_member_edit_history").insert(historyRows);
    }

    return NextResponse.json({ success: true, updatedFields: Object.keys(allowed) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
