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
import ThreadPanel from "./components/ThreadPanel";

// ---------------------------------------------------------------------------
// Welcome screen shown before any channel is selected
// ---------------------------------------------------------------------------
function WelcomeState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
        <MessageSquare size={38} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to Messages</h2>
      <p className="text-slate-500 max-w-sm text-sm">
        Select a channel from the sidebar to start collaborating with your team in real-time.
      </p>
      <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
        <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-left">
          <Globe size={18} className="text-emerald-500 mb-2" />
          <p className="text-xs font-bold text-slate-800 mb-1">General</p>
          <p className="text-[11px] text-slate-400">Workspace-wide chat for everyone.</p>
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MessagesPage() {
  const supabase = createClient();
  const router = useRouter();

  // ── Core workspace state ───────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);

  // ── Channel / message state ────────────────────────────────────────────
  const [activeChannel, setActiveChannel] = useState<ActiveChannel | null>(null);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [feedState, setFeedState] = useState<FeedState>("idle");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [replyTo, setReplyTo] = useState<EnrichedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Incrementing this forces a fresh realtime subscription (manual reconnect)
  const [subVersion, setSubVersion] = useState(0);

  // ── Thread state ───────────────────────────────────────────────────────
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadRoot, setThreadRoot] = useState<EnrichedMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<EnrichedMessage[]>([]);
  const [threadFeedState, setThreadFeedState] = useState<FeedState>("idle");
  const [threadSendState, setThreadSendState] = useState<SendState>("idle");
  const [threadSendError, setThreadSendError] = useState<string | null>(null);
  const [threadSubVersion, setThreadSubVersion] = useState(0);

  // ── Refs ───────────────────────────────────────────────────────────────
  const senderMapRef = useRef<Map<string, string>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Scroll helpers ─────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const scrollThreadToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (threadScrollRef.current) {
        threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
      }
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Load workspace data on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

      // /api/me/role gets the workspace ID reliably (admin client, checks owner_id).
      const roleRes = await fetch("/api/me/role");
      if (!roleRes.ok) return;
      const { workspaceId: wsId } = await roleRes.json() as { workspaceId: string };
      if (!wsId) return;

      setWorkspaceId(wsId);

      // /api/messages/my-channels uses admin client for ALL queries — bypasses RLS
      // that would block the owner (who is in workspace_members, not team_members).
      // Returns role, visible projects, team members, and member count.
      const chRes = await fetch(`/api/messages/my-channels?workspaceId=${wsId}`);
      if (!chRes.ok) return;
      const chData = await chRes.json() as {
        role: string;
        projects: { id: string; name: string }[];
        members: TeamMember[];
        memberCount: number;
      };

      setUserRole(chData.role);
      setProjects(chData.projects);
      setMemberCount(chData.memberCount);

      const nameMap = new Map<string, string>();
      (chData.members ?? []).forEach((m) => nameMap.set(m.user_id, m.full_name));
      senderMapRef.current = nameMap;
      setTeamMembers(chData.members);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch message history when active channel changes
  // ---------------------------------------------------------------------------
  const fetchHistory = useCallback(
    async (channel: ActiveChannel, signal: AbortSignal) => {
      setFeedState("loading");
      try {
        let url = `/api/messages/history?workspaceId=${channel.workspaceId}`;
        if (channel.type === "project") url += `&projectId=${channel.id}`;
        const res = await fetch(url, { signal });
        if (res.status === 403) {
          setFeedState("access_denied");
          return;
        }
        if (!res.ok) {
          setFeedState("error");
          return;
        }
        const data = await res.json();
        setMessages(data.messages ?? []);
        setFeedState("ready");
        // Scroll to bottom once messages load
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        });
      } catch (err: any) {
        if (err?.name === "AbortError") return; // cancelled by channel switch
        setFeedState("error");
      }
    },
    [] // stable — only uses state setters and fetch
  );

  useEffect(() => {
    if (!activeChannel) return;
    const controller = new AbortController();
    fetchHistory(activeChannel, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  // ---------------------------------------------------------------------------
  // Realtime subscription for main channel
  //
  // INSERT events: received via Supabase Broadcast (sent from the send API route).
  //   Broadcast bypasses RLS — the owner (not in team_members) receives all messages.
  //
  // UPDATE events: received via postgres_changes (pin/unpin, thread_reply_count).
  //   These still use the user's session but are a nice-to-have — the main path
  //   is the broadcast for new messages.
  //
  // Channel topic matches exactly what the server broadcasts to:
  //   general  → workspace:<workspaceId>
  //   project  → project:<projectId>
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeChannel || !workspaceId) return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const topic =
      activeChannel.type === "general"
        ? `workspace:${workspaceId}`
        : `project:${activeChannel.id}`;

    const pgFilter =
      activeChannel.type === "general"
        ? `workspace_id=eq.${workspaceId}`
        : `project_id=eq.${activeChannel.id}`;

    // channelKey MUST exactly match the topic the server broadcasts to
    // (`workspace:<id>` or `project:<id>`). subVersion is NOT part of the
    // channel name — when it changes, the useEffect re-runs, the old channel
    // is removed by the cleanup, and a new subscription is created with the
    // same topic so the server can reach it again.
    const channelKey = topic;

    const sub = supabase
      .channel(channelKey)
      // ── Broadcast: new message (INSERT) ─────────────────────────────────────
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        const enriched = payload as EnrichedMessage;
        // Ignore thread replies and cross-channel leakage
        if (enriched.thread_root_id) return;
        if (activeChannel.type === "general" && enriched.project_id !== null) return;
        setMessages((prev) => appendWithDedup(prev, enriched));
        scrollToBottom();
      })
      // ── Broadcast: message update (pin/unpin from pin route) ─────────────────
      .on("broadcast", { event: "update_message" }, ({ payload }) => {
        const patch = payload as { id: string; is_pinned?: boolean; thread_reply_count?: number };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === patch.id
              ? {
                  ...m,
                  ...(patch.is_pinned !== undefined && { is_pinned: patch.is_pinned }),
                  ...(patch.thread_reply_count !== undefined && {
                    thread_reply_count: patch.thread_reply_count,
                  }),
                }
              : m
          )
        );
      })
      // ── postgres_changes: UPDATE (thread_reply_count from DB trigger) ────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: pgFilter },
        (payload) => {
          const updated = payload.new as Record<string, any>;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    is_pinned: updated.is_pinned ?? m.is_pinned,
                    thread_reply_count: updated.thread_reply_count ?? m.thread_reply_count,
                  }
                : m
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionError(false);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionError(true);
          reconnectTimer = setTimeout(() => setSubVersion((v) => v + 1), 3_000);
        }
      });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, subVersion, workspaceId]);

  // ---------------------------------------------------------------------------
  // Realtime subscription for open thread
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!threadRoot || !threadOpen || !workspaceId) return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const filter = `thread_root_id=eq.${threadRoot.id}`;
    const channelKey = `thread:${threadRoot.id}:v${threadSubVersion}`;

    const sub = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter },
        (payload) => {
          const raw = payload.new as Record<string, any>;
          const senderId = raw.sender_id as string;
          const fullName = senderMapRef.current.get(senderId) ?? "Unknown Member";

          const enriched: EnrichedMessage = {
            id: raw.id,
            workspace_id: raw.workspace_id,
            project_id: raw.project_id ?? null,
            sender_id: senderId,
            receiver_id: raw.receiver_id ?? null,
            content: raw.content ?? "",
            created_at: raw.created_at,
            reply_to_id: raw.reply_to_id ?? null,
            thread_root_id: raw.thread_root_id,
            thread_reply_count: 0,
            is_pinned: raw.is_pinned ?? false,
            file_url: raw.file_url ?? null,
            file_name: raw.file_name ?? null,
            file_type: raw.file_type ?? null,
            sender: { user_id: senderId, full_name: fullName },
            reply_preview: null,
          };

          setThreadMessages((prev) => appendWithDedup(prev, enriched));
          scrollThreadToBottom();
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reconnectTimer = setTimeout(() => setThreadSubVersion((v) => v + 1), 3_000);
        }
      });

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadRoot, threadOpen, threadSubVersion, workspaceId]);

  // ---------------------------------------------------------------------------
  // Switch channel — clean, non-async, lets React lifecycle manage subscriptions
  // ---------------------------------------------------------------------------
  const switchChannel = useCallback((channel: ActiveChannel) => {
    setActiveChannel(channel);
    setMessages([]);
    setConnectionError(false);
    setReplyTo(null);
    setSearchQuery("");
    // Close any open thread panel
    setThreadOpen(false);
    setThreadRoot(null);
    setThreadMessages([]);
    setThreadFeedState("idle");
    // Reset sub version so a fresh subscription key is generated
    setSubVersion(0);
  }, []);

  const handleManualReconnect = useCallback(() => {
    setSubVersion((v) => v + 1);
  }, []);

  const handleRetry = useCallback(() => {
    if (!activeChannel) return;
    const controller = new AbortController();
    fetchHistory(activeChannel, controller.signal);
  }, [activeChannel, fetchHistory]);

  // ---------------------------------------------------------------------------
  // Send message to main channel
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (
      content: string,
      replyToId?: string,
      fileUrl?: string,
      fileName?: string,
      fileType?: string
    ) => {
      if (!workspaceId || !activeChannel) return;
      setSendState("sending");
      setSendError(null);
      try {
        const body: Record<string, string | undefined> = { workspaceId, content };
        if (activeChannel.type === "project") body.projectId = activeChannel.id;
        if (replyToId) body.reply_to_id = replyToId;
        if (fileUrl) {
          body.file_url = fileUrl;
          body.file_name = fileName;
          body.file_type = fileType;
        }
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
  // Pin / unpin a message
  // ---------------------------------------------------------------------------
  const handlePin = useCallback(
    async (messageId: string) => {
      if (!workspaceId) return;
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_pinned: !m.is_pinned } : m))
      );
      await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, workspaceId }),
      });
    },
    [workspaceId]
  );

  // ---------------------------------------------------------------------------
  // Open thread panel
  // ---------------------------------------------------------------------------
  const openThread = useCallback(
    async (message: EnrichedMessage) => {
      setThreadRoot(message);
      setThreadMessages([]);
      setThreadFeedState("loading");
      setThreadOpen(true);
      setThreadSubVersion(0);

      try {
        const res = await fetch(
          `/api/messages/thread?rootId=${message.id}&workspaceId=${message.workspace_id}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setThreadMessages(data.messages ?? []);
        setThreadFeedState("ready");
        scrollThreadToBottom();
      } catch {
        setThreadFeedState("error");
      }
    },
    [scrollThreadToBottom]
  );

  const closeThread = useCallback(() => {
    setThreadOpen(false);
    setThreadRoot(null);
    setThreadMessages([]);
    setThreadFeedState("idle");
  }, []);

  // ---------------------------------------------------------------------------
  // Send a thread reply
  // ---------------------------------------------------------------------------
  const sendThreadReply = useCallback(
    async (
      content: string,
      replyToId?: string,
      fileUrl?: string,
      fileName?: string,
      fileType?: string
    ) => {
      if (!workspaceId || !activeChannel || !threadRoot) return;
      setThreadSendState("sending");
      setThreadSendError(null);
      try {
        const body: Record<string, string | undefined> = {
          workspaceId,
          content,
          thread_root_id: threadRoot.id,
        };
        if (activeChannel.type === "project") body.projectId = activeChannel.id;
        if (replyToId) body.reply_to_id = replyToId;
        if (fileUrl) {
          body.file_url = fileUrl;
          body.file_name = fileName;
          body.file_type = fileType;
        }
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to send");
        }
        setThreadSendState("idle");
      } catch (err) {
        setThreadSendState("error");
        setThreadSendError(err instanceof Error ? err.message : "Failed to send");
      }
    },
    [workspaceId, activeChannel, threadRoot]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="h-[calc(100vh-140px)] flex bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Channels sidebar */}
      <MessagesSidebar
        workspaceId={workspaceId}
        projects={projects}
        activeChannel={activeChannel}
        userRole={userRole}
        onSelectChannel={switchChannel}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel === null ? (
          <WelcomeState />
        ) : (
          <>
            <ChannelHeader
              channel={activeChannel}
              connectionError={connectionError}
              searchQuery={searchQuery}
              memberCount={activeChannel.type === "general" ? memberCount : undefined}
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
              onOpenThread={openThread}
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

      {/* Thread panel — slides in from the right */}
      {threadOpen && threadRoot && (
        <ThreadPanel
          rootMessage={threadRoot}
          messages={threadMessages}
          feedState={threadFeedState}
          sendState={threadSendState}
          sendError={threadSendError}
          currentUserId={user?.id ?? ""}
          teamMembers={teamMembers}
          workspaceId={workspaceId ?? ""}
          scrollRef={threadScrollRef as React.RefObject<HTMLDivElement>}
          onClose={closeThread}
          onSend={sendThreadReply}
          onPin={handlePin}
        />
      )}
    </div>
  );
}
