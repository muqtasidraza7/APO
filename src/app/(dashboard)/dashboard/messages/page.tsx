"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useRouter } from "next/navigation";
import { MessageSquare, Hash, Globe } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import type {
  ActiveChannel,
  EnrichedMessage,
  FeedState,
  SendState,
  WorkspaceProject,
  TeamMember,
} from "./types";
import { appendWithDedup } from "./lib";
import MessagesSidebar from "./components/MessagesSidebar";
import ChannelHeader from "./components/ChannelHeader";
import MessageFeed from "./components/MessageFeed";
import MessageComposer from "./components/MessageComposer";

function WelcomeState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-indigo-500">
        <MessageSquare size={40} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to Messages</h2>
      <p className="text-slate-500 max-w-sm text-sm">
        Select a channel from the sidebar to start collaborating with your team in real-time.
      </p>
      <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-left">
          <Globe size={18} className="text-indigo-500 mb-2" />
          <p className="text-xs font-bold text-slate-800 mb-1">General</p>
          <p className="text-[11px] text-slate-400">Workspace-wide announcements and chat.</p>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-left">
          <Hash size={18} className="text-violet-500 mb-2" />
          <p className="text-xs font-bold text-slate-800 mb-1">Project Channels</p>
          <p className="text-[11px] text-slate-400">Focused discussions per project.</p>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeChannel, setActiveChannel] = useState<ActiveChannel | null>(null);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [feedState, setFeedState] = useState<FeedState>("idle");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [replyTo, setReplyTo] = useState<EnrichedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Incrementing this key forces the subscription useEffect to re-run (reconnect)
  const [reconnectKey, setReconnectKey] = useState(0);

  const senderMapRef = useRef<Map<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const activeChannelRef = useRef<ActiveChannel | null>(null);
  const realtimeSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Load workspace data on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser);

      const { data: memberships } = await supabase
        .from("team_members")
        .select("workspace_id, full_name, user_id")
        .eq("user_id", authUser.id);

      if (!memberships || memberships.length === 0) return;
      const wsId = memberships[0].workspace_id;
      setWorkspaceId(wsId);

      const { data: allMembers } = await supabase
        .from("team_members")
        .select("user_id, full_name")
        .eq("workspace_id", wsId);

      const map = new Map<string, string>();
      const memberList: TeamMember[] = [];
      (allMembers ?? []).forEach((m) => {
        if (m.user_id) {
          map.set(m.user_id, m.full_name || "");
          if (m.full_name) memberList.push({ user_id: m.user_id, full_name: m.full_name });
        }
      });
      senderMapRef.current = map;
      setTeamMembers(memberList);

      const { data: projectData } = await supabase
        .from("projects").select("id, name").eq("workspace_id", wsId);
      setProjects(projectData ?? []);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch message history
  // ---------------------------------------------------------------------------
  const fetchHistory = useCallback(async (channel: ActiveChannel) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      let url = `/api/messages/history?workspaceId=${channel.workspaceId}`;
      if (channel.type === "project") url += `&projectId=${channel.id}`;
      const res = await fetch(url, { signal: controller.signal });
      if (res.status === 403) { setFeedState("access_denied"); return; }
      if (!res.ok) { setFeedState("error"); return; }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setFeedState("ready");
    } catch {
      setFeedState("error");
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Realtime subscription — reconnectKey in deps triggers reconnect on demand
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeChannel) return;

    // Clear any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const channelKey =
      activeChannel.type === "general"
        ? `messages:ws:${activeChannel.workspaceId}:${reconnectKey}`
        : `messages:proj:${activeChannel.id}:${reconnectKey}`;

    const filter =
      activeChannel.type === "general"
        ? `workspace_id=eq.${activeChannel.workspaceId}`
        : `project_id=eq.${activeChannel.id}`;

    const sub = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter },
        async (payload) => {
          const raw = payload.new as any;
          const current = activeChannelRef.current;
          if (!current) return;
          if (current.type === "general" && raw.project_id !== null) return;

          const fullName = senderMapRef.current.get(raw.sender_id) ?? "Unknown Member";

          // Fetch reply preview if needed
          let reply_preview = null;
          if (raw.reply_to_id) {
            const { data: parent } = await supabase
              .from("messages").select("id, sender_id, content")
              .eq("id", raw.reply_to_id).maybeSingle();
            if (parent) {
              reply_preview = {
                id: parent.id,
                sender_name: senderMapRef.current.get(parent.sender_id) ?? "Unknown Member",
                content: parent.content ?? "",
              };
            }
          }

          const enriched: EnrichedMessage = {
            ...raw,
            receiver_id: raw.receiver_id ?? null,
            project_id: raw.project_id ?? null,
            reply_to_id: raw.reply_to_id ?? null,
            is_pinned: raw.is_pinned ?? false,
            file_url: raw.file_url ?? null,
            file_name: raw.file_name ?? null,
            file_type: raw.file_type ?? null,
            sender: { user_id: raw.sender_id, full_name: fullName },
            reply_preview,
          };

          setMessages((prev) => appendWithDedup(prev, enriched));
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter },
        (payload) => {
          const updated = payload.new as any;
          // Patch the message in state (handles pin/unpin without full refetch)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id ? { ...m, is_pinned: updated.is_pinned ?? m.is_pinned } : m
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionError(false);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionError(true);
          // Auto-reconnect: bump reconnectKey after a short delay
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            setReconnectKey((k) => k + 1);
          }, 3000);
        }
      });

    realtimeSubRef.current = sub;

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      supabase.removeChannel(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, reconnectKey]);

  // ---------------------------------------------------------------------------
  // Switch channel
  // ---------------------------------------------------------------------------
  const switchChannel = useCallback(
    async (channel: ActiveChannel) => {
      if (realtimeSubRef.current) {
        await supabase.removeChannel(realtimeSubRef.current);
        realtimeSubRef.current = null;
      }
      setActiveChannel(channel);
      setMessages([]);
      setFeedState("loading");
      setConnectionError(false);
      setReplyTo(null);
      setSearchQuery("");
      setReconnectKey(0);
      await fetchHistory(channel);
      scrollToBottom();
    },
    [fetchHistory, scrollToBottom, supabase]
  );

  // ---------------------------------------------------------------------------
  // Manual reconnect (Retry Now button)
  // ---------------------------------------------------------------------------
  const handleManualReconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setReconnectKey((k) => k + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string, replyToId?: string, fileUrl?: string, fileName?: string, fileType?: string) => {
      if (!workspaceId || !activeChannel) return;
      setSendState("sending");
      setSendError(null);
      try {
        const body: Record<string, string | undefined> = { workspaceId, content };
        if (activeChannel.type === "project") body.projectId = activeChannel.id;
        if (replyToId) body.reply_to_id = replyToId;
        if (fileUrl) { body.file_url = fileUrl; body.file_name = fileName; body.file_type = fileType; }

        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to send message");
        }
        setSendState("idle");
        setReplyTo(null);
      } catch (err) {
        setSendState("error");
        setSendError(err instanceof Error ? err.message : "Failed to send message");
      }
    },
    [workspaceId, activeChannel]
  );

  // ---------------------------------------------------------------------------
  // Pin message
  // ---------------------------------------------------------------------------
  const handlePin = useCallback(
    async (messageId: string) => {
      if (!workspaceId) return;
      await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, workspaceId }),
      });
      // Optimistic update already handled by realtime UPDATE handler
      // Fallback: patch immediately if realtime is slow
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m))
      );
    },
    [workspaceId]
  );

  const handleRetry = useCallback(() => {
    if (!activeChannel) return;
    setFeedState("loading");
    fetchHistory(activeChannel);
  }, [activeChannel, fetchHistory]);

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <MessagesSidebar
        workspaceId={workspaceId}
        projects={projects}
        activeChannel={activeChannel}
        onSelectChannel={switchChannel}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel === null ? (
          <WelcomeState />
        ) : (
          <>
            <ChannelHeader
              channel={activeChannel}
              connectionError={connectionError}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onReconnect={handleManualReconnect}
            />

            <MessageFeed
              messages={messages}
              feedState={feedState}
              currentUserId={user?.id ?? ""}
              channelName={activeChannel.name}
              searchQuery={searchQuery}
              scrollRef={scrollRef as React.RefObject<HTMLDivElement>}
              messageRefs={messageRefs}
              onRetry={handleRetry}
              onReply={setReplyTo}
              onPin={handlePin}
            />

            <MessageComposer
              channelName={activeChannel.name}
              sendState={sendState}
              sendError={sendError}
              replyTo={replyTo}
              teamMembers={teamMembers}
              workspaceId={workspaceId ?? ""}
              onSend={sendMessage}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}
