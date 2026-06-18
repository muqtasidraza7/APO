import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createAdminClient } from "../../../utils/supabase/admin";
import type { EnrichedMessage } from "@/app/(dashboard)/dashboard/messages/types";

export const runtime = "nodejs";

// GET /api/messages/thread?rootId=<id>&workspaceId=<id>
// Returns the root message plus all thread replies, in chronological order.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rootId = searchParams.get("rootId");
    const workspaceId = searchParams.get("workspaceId");

    if (!rootId || !workspaceId) {
      return NextResponse.json({ error: "rootId and workspaceId are required" }, { status: 400 });
    }

    // Verify workspace membership via workspace_members (owner may not have a team_members row)
    const admin = createAdminClient();
    const { data: memberRow } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!memberRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the root message (admin client — bypasses messages table RLS)
    const { data: rootMsg, error: rootError } = await admin
      .from("messages")
      .select("*")
      .eq("id", rootId)
      .maybeSingle();

    if (rootError || !rootMsg) {
      return NextResponse.json({ error: "Thread root not found" }, { status: 404 });
    }

    // Fetch thread replies
    const { data: replies, error: repliesError } = await admin
      .from("messages")
      .select("*")
      .eq("thread_root_id", rootId)
      .order("created_at", { ascending: true });

    if (repliesError) throw repliesError;

    const allMsgs = [rootMsg, ...(replies ?? [])];

    // Batch-fetch sender names
    const senderIds = [...new Set(allMsgs.map((m) => m.sender_id))];
    const { data: senders } = await admin
      .from("team_members")
      .select("user_id, full_name")
      .eq("workspace_id", workspaceId)
      .in("user_id", senderIds);

    const senderMap = new Map<string, string>(
      (senders ?? []).map((s) => [s.user_id, s.full_name])
    );

    const messageById = new Map(allMsgs.map((m) => [m.id, m]));

    // Collect any reply-preview IDs not in the current page
    const extraReplyIds = allMsgs
      .map((m) => m.reply_to_id)
      .filter((id): id is string => !!id && !messageById.has(id));

    let extraMsgs: any[] = [];
    if (extraReplyIds.length > 0) {
      const { data } = await admin
        .from("messages")
        .select("id, sender_id, content")
        .in("id", [...new Set(extraReplyIds)]);
      extraMsgs = data ?? [];
    }
    const extraById = new Map(extraMsgs.map((m) => [m.id, m]));

    const enrich = (msg: any): EnrichedMessage => {
      let reply_preview = null;
      if (msg.reply_to_id) {
        const parent = messageById.get(msg.reply_to_id) ?? extraById.get(msg.reply_to_id);
        if (parent) {
          reply_preview = {
            id: parent.id,
            sender_name: senderMap.get(parent.sender_id) ?? "Unknown Member",
            content: parent.content ?? "",
          };
        }
      }
      return {
        ...msg,
        receiver_id: msg.receiver_id ?? null,
        project_id: msg.project_id ?? null,
        reply_to_id: msg.reply_to_id ?? null,
        thread_root_id: msg.thread_root_id ?? null,
        thread_reply_count: msg.thread_reply_count ?? 0,
        is_pinned: msg.is_pinned ?? false,
        file_url: msg.file_url ?? null,
        file_name: msg.file_name ?? null,
        file_type: msg.file_type ?? null,
        sender: {
          user_id: msg.sender_id,
          full_name: senderMap.get(msg.sender_id) ?? "Unknown Member",
        },
        reply_preview,
      };
    };

    return NextResponse.json({
      success: true,
      rootMessage: enrich(rootMsg),
      messages: (replies ?? []).map(enrich),
    });
  } catch (error: unknown) {
    console.error("Thread route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
