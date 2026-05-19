import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { parseCursor } from "../../../utils/pagination";
import type { EnrichedMessage } from "@/app/(dashboard)/dashboard/messages/types";

export const runtime = "nodejs";

// GET /api/messages/history?workspaceId=…&projectId=…&before=<ISO>&limit=50
//
// Cursor-based pagination: the client passes `before=<created_at of oldest message
// currently in view>` to load the next page of older messages.
// Omit `before` to get the latest page.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");
    const before = parseCursor(searchParams, "before");
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50),
      100
    );

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const { data: memberRow } = await supabase
      .from("team_members").select("user_id")
      .eq("user_id", user.id).eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!memberRow) {
      return NextResponse.json({ error: "Forbidden: not a workspace member" }, { status: 403 });
    }

    if (projectId) {
      const { data: projectRow } = await supabase
        .from("projects").select("id")
        .eq("id", projectId).eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!projectRow) {
        return NextResponse.json({ error: "Forbidden: project not found in workspace" }, { status: 403 });
      }
    }

    // Build base query
    let query = supabase.from("messages").select("*").eq("workspace_id", workspaceId);
    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null).is("receiver_id", null);
    }

    // Cursor: fetch messages strictly before the given timestamp
    if (before) {
      query = query.lt("created_at", before.toISOString());
    }

    // Fetch newest-first so we can honour the `limit`, then reverse for the UI
    const { data: messages, error: messagesError } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (messagesError) throw messagesError;

    // Check whether an older page exists (one extra record beyond our limit)
    let hasOlderMessages = false;
    if (messages && messages.length === limit) {
      const oldest = messages[messages.length - 1].created_at;
      let olderQuery = supabase
        .from("messages")
        .select("id", { head: true, count: "exact" })
        .eq("workspace_id", workspaceId)
        .lt("created_at", oldest);
      if (projectId) {
        olderQuery = olderQuery.eq("project_id", projectId);
      } else {
        olderQuery = olderQuery.is("project_id", null).is("receiver_id", null);
      }
      const { count } = await olderQuery;
      hasOlderMessages = (count ?? 0) > 0;
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        messages: [],
        pagination: { hasOlderMessages: false, oldestCursor: null },
      });
    }

    // Reverse so the UI receives chronological (ascending) order
    const chronological = [...messages].reverse();

    // Batch-fetch all sender names
    const senderIds = [...new Set(chronological.map((m) => m.sender_id))];
    const { data: senders } = await supabase
      .from("team_members").select("user_id, full_name")
      .eq("workspace_id", workspaceId).in("user_id", senderIds);

    const senderMap = new Map<string, string>(
      (senders ?? []).map((s) => [s.user_id, s.full_name])
    );

    const messageById = new Map(chronological.map((m) => [m.id, m]));

    // Fetch any reply-preview messages that aren't in this page
    const replyIds = chronological
      .map((m) => m.reply_to_id)
      .filter((id): id is string => !!id && !messageById.has(id));

    let extraMessages: any[] = [];
    if (replyIds.length > 0) {
      const { data: extras } = await supabase
        .from("messages").select("id, sender_id, content")
        .in("id", [...new Set(replyIds)]);
      extraMessages = extras ?? [];
    }
    const extraById = new Map(extraMessages.map((m) => [m.id, m]));

    const enrichedMessages: EnrichedMessage[] = chronological.map((msg) => {
      const fullName = senderMap.get(msg.sender_id) || "Unknown Member";

      let reply_preview = null;
      if (msg.reply_to_id) {
        const parent = messageById.get(msg.reply_to_id) ?? extraById.get(msg.reply_to_id);
        if (parent) {
          reply_preview = {
            id: parent.id,
            sender_name: senderMap.get(parent.sender_id) || "Unknown Member",
            content: parent.content || "",
          };
        }
      }

      return {
        ...msg,
        receiver_id: msg.receiver_id ?? null,
        project_id: msg.project_id ?? null,
        reply_to_id: msg.reply_to_id ?? null,
        is_pinned: msg.is_pinned ?? false,
        file_url: msg.file_url ?? null,
        file_name: msg.file_name ?? null,
        file_type: msg.file_type ?? null,
        sender: { user_id: msg.sender_id, full_name: fullName },
        reply_preview,
      };
    });

    return NextResponse.json({
      success: true,
      messages: enrichedMessages,
      pagination: {
        hasOlderMessages,
        // Pass back as a cursor so the client can load older messages
        oldestCursor: chronological[0]?.created_at ?? null,
        limit,
      },
    });
  } catch (error: unknown) {
    console.error("Messages History Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
