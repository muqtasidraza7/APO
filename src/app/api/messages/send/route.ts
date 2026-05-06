import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { workspaceId, projectId, receiverId, content } = body;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!workspaceId || !content) {
      return NextResponse.json({ error: "workspaceId and content are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId || null,
        receiver_id: receiverId || null,
        sender_id: user.id,
        content: content.trim()
      })
      .select("*")
      .single();

    if (error) throw error;

    // Fetch sender details manually
    const { data: sender } = await supabase
      .from("team_members")
      .select("id, full_name, user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    const enriched = {
      ...data,
      sender: {
        user_id: user.id,
        full_name: sender?.full_name || user.user_metadata?.full_name || "You"
      }
    };

    return NextResponse.json({ success: true, message: enriched });

  } catch (error: any) {
    console.error("Send Message Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
