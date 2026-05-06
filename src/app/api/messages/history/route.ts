import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");
    const receiverId = searchParams.get("receiverId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    let query = supabase
      .from("messages")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (projectId) {
      // Project Channel
      query = query.eq("project_id", projectId);
    } else if (receiverId) {
      // Direct Message
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      
      query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`);
    } else {
      // Workspace General Channel
      query = query.is("project_id", null).is("receiver_id", null);
    }
    const { data, error } = await query
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    // 4. Manually fetch sender details to avoid join errors
    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: senders } = await supabase
        .from("team_members")
        .select("id, full_name, user_id")
        .eq("workspace_id", workspaceId)
        .in("user_id", senderIds);

      const enrichedMessages = data.map(msg => ({
        ...msg,
        sender: senders?.find(s => s.user_id === msg.sender_id) || { full_name: "Unknown", user_id: msg.sender_id }
      }));

      return NextResponse.json({ success: true, messages: enrichedMessages });
    }

    return NextResponse.json({ success: true, messages: [] });

  } catch (error: any) {
    console.error("Messages History Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
