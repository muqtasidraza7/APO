import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageId, workspaceId } = await request.json();
    if (!messageId || !workspaceId) {
      return NextResponse.json({ error: "messageId and workspaceId required" }, { status: 400 });
    }

    // Verify membership
    const { data: memberRow } = await supabase
      .from("team_members").select("user_id")
      .eq("user_id", user.id).eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!memberRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch current pin state
    const { data: msg } = await supabase
      .from("messages").select("id, is_pinned, workspace_id")
      .eq("id", messageId).maybeSingle();

    if (!msg || msg.workspace_id !== workspaceId) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("messages")
      .update({ is_pinned: !msg.is_pinned })
      .eq("id", messageId);

    if (error) throw error;

    return NextResponse.json({ success: true, is_pinned: !msg.is_pinned });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
