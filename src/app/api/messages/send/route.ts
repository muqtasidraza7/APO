import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import { createNotification } from "../../../utils/notifications";
import type { EnrichedMessage } from "@/app/(dashboard)/dashboard/messages/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const { workspaceId, content, projectId, reply_to_id, file_url, file_name, file_type } = body as {
      workspaceId?: unknown;
      content?: unknown;
      projectId?: unknown;
      reply_to_id?: unknown;
      file_url?: unknown;
      file_name?: unknown;
      file_type?: unknown;
    };

    if (!workspaceId || typeof workspaceId !== "string" || workspaceId.trim() === "") {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // content is optional if a file is attached
    const hasFile = file_url && typeof file_url === "string";
    const trimmedContent = typeof content === "string" ? content.trim() : "";

    if (!hasFile && trimmedContent.length === 0) {
      return NextResponse.json({ error: "content cannot be empty" }, { status: 400 });
    }
    if (trimmedContent.length > 4000) {
      return NextResponse.json({ error: "content exceeds 4000 characters" }, { status: 400 });
    }

    const resolvedProjectId = typeof projectId === "string" ? projectId : null;
    const resolvedReplyToId = typeof reply_to_id === "string" ? reply_to_id : null;

    // Verify workspace membership
    const { data: memberRow } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!memberRow) {
      return NextResponse.json({ error: "Forbidden: not a workspace member" }, { status: 403 });
    }

    if (resolvedProjectId) {
      const { data: projectRow } = await supabase
        .from("projects").select("id")
        .eq("id", resolvedProjectId).eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!projectRow) {
        return NextResponse.json({ error: "Forbidden: project not found in workspace" }, { status: 403 });
      }
    }

    if (resolvedReplyToId) {
      const { data: parentRow } = await supabase
        .from("messages").select("id").eq("id", resolvedReplyToId).maybeSingle();
      if (!parentRow) {
        return NextResponse.json({ error: "Reply target message not found" }, { status: 400 });
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        project_id: resolvedProjectId,
        sender_id: user.id,
        receiver_id: null,
        content: trimmedContent,
        reply_to_id: resolvedReplyToId,
        file_url: hasFile ? (file_url as string) : null,
        file_name: typeof file_name === "string" ? file_name : null,
        file_type: typeof file_type === "string" ? file_type : null,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    const { data: senderRow } = await supabase
      .from("team_members")
      .select("user_id, full_name")
      .eq("user_id", user.id).eq("workspace_id", workspaceId)
      .maybeSingle();

    const fullName = senderRow?.full_name?.trim() || "Unknown Member";

    // Detect @mentions and notify mentioned members (fire-and-forget)
    if (trimmedContent.length > 0) {
      const mentionMatches = trimmedContent.match(/@[A-Za-z]+(?:\s[A-Za-z]+)?/g) || [];
      if (mentionMatches.length > 0) {
        const mentionTokens = mentionMatches.map((m) => m.slice(1).trim().toLowerCase());
        const { data: wsMembers } = await supabase
          .from("team_members")
          .select("id, full_name, user_id")
          .eq("workspace_id", workspaceId);

        const alreadyNotified = new Set<string>();
        for (const member of (wsMembers || [])) {
          if (!member.user_id || member.user_id === user.id) continue;
          const mName = (member.full_name || "").toLowerCase();
          const matched = mentionTokens.some((tok) => tok.length >= 2 && mName.includes(tok));
          if (matched && !alreadyNotified.has(member.user_id)) {
            alreadyNotified.add(member.user_id);
            createNotification({
              userId: member.user_id,
              type: "mention",
              title: "You were mentioned",
              body: `${fullName}: "${trimmedContent.slice(0, 100)}${trimmedContent.length > 100 ? "…" : ""}"`,
              link: "/dashboard/messages",
            });
          }
        }
      }
    }

    // Fetch reply preview if this is a reply
    let reply_preview = null;
    if (resolvedReplyToId) {
      const { data: parentMsg } = await supabase
        .from("messages").select("id, sender_id, content")
        .eq("id", resolvedReplyToId).maybeSingle();
      if (parentMsg) {
        const { data: parentSender } = await supabase
          .from("team_members").select("full_name")
          .eq("user_id", parentMsg.sender_id).eq("workspace_id", workspaceId)
          .maybeSingle();
        reply_preview = {
          id: parentMsg.id,
          sender_name: parentSender?.full_name || "Unknown Member",
          content: parentMsg.content,
        };
      }
    }

    const enrichedMessage: EnrichedMessage = {
      ...inserted,
      receiver_id: inserted.receiver_id ?? null,
      project_id: inserted.project_id ?? null,
      reply_to_id: inserted.reply_to_id ?? null,
      is_pinned: inserted.is_pinned ?? false,
      file_url: inserted.file_url ?? null,
      file_name: inserted.file_name ?? null,
      file_type: inserted.file_type ?? null,
      sender: { user_id: user.id, full_name: fullName },
      reply_preview,
    };

    return NextResponse.json({ success: true, message: enrichedMessage });
  } catch (error: unknown) {
    console.error("Messages Send Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
