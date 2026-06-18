"use client";

import React from "react";
import { Loader2, AlertCircle, Lock, MessageSquare, Pin, X } from "lucide-react";
import { groupMessages, isSameDay, formatDateSeparator } from "../lib";
import type { EnrichedMessage, FeedState } from "../types";
import MessageGroupComponent from "./MessageGroup";

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
        <span className="text-sm">Loading messages…</span>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm font-medium">Failed to load messages</p>
        <button
          onClick={onRetry}
          className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState({ channelName }: { channelName: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <MessageSquare size={26} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600 mb-1">
            No messages yet in <span className="text-indigo-600">#{channelName}</span>
          </p>
          <p className="text-xs text-slate-400">Be the first to start the conversation!</p>
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function PinnedBanner({
  pinned,
  onScrollTo,
  onClose,
}: {
  pinned: EnrichedMessage[];
  onScrollTo: (id: string) => void;
  onClose: () => void;
}) {
  const latest = pinned[pinned.length - 1];
  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs">
      <Pin size={11} className="text-amber-500 flex-shrink-0" />
      <button
        onClick={() => onScrollTo(latest.id)}
        className="flex-1 text-left text-amber-800 hover:text-amber-900 transition-colors"
      >
        <span className="font-semibold">
          {pinned.length} pinned message{pinned.length !== 1 ? "s" : ""}
        </span>
        <span className="text-amber-600 ml-1.5 truncate">
          — {latest.content?.slice(0, 60) || latest.file_name || "Attachment"}
        </span>
      </button>
      <button
        onClick={onClose}
        className="p-0.5 text-amber-400 hover:text-amber-600 transition-colors rounded"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export interface MessageFeedProps {
  messages: EnrichedMessage[];
  feedState: FeedState;
  currentUserId: string;
  channelName: string;
  searchQuery: string;
  scrollRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onRetry: () => void;
  onReply: (message: EnrichedMessage) => void;
  onPin: (messageId: string) => void;
  onOpenThread: (message: EnrichedMessage) => void;
}

export default function MessageFeed({
  messages,
  feedState,
  currentUserId,
  channelName,
  searchQuery,
  scrollRef,
  messageRefs,
  onRetry,
  onReply,
  onPin,
  onOpenThread,
}: MessageFeedProps) {
  const [showPinned, setShowPinned] = React.useState(true);

  const filtered = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const pinned = messages.filter((m) => m.is_pinned);
  const groups = feedState === "ready" ? groupMessages(filtered) : [];

  const scrollToMessage = (id: string) => {
    const el = messageRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {feedState === "ready" && pinned.length > 0 && showPinned && (
        <PinnedBanner
          pinned={pinned}
          onScrollTo={scrollToMessage}
          onClose={() => setShowPinned(false)}
        />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 flex flex-col bg-white">
        {searchQuery.trim() && feedState === "ready" && (
          <div className="px-4 py-2 text-xs text-indigo-600 font-semibold border-b border-slate-100">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
          </div>
        )}

        {feedState === "loading" && <LoadingState />}
        {feedState === "error" && <ErrorState onRetry={onRetry} />}
        {feedState === "access_denied" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Lock size={28} className="text-slate-400" />
              <p className="text-sm font-medium">You don&apos;t have access to this channel</p>
            </div>
          </div>
        )}

        {feedState === "ready" && filtered.length === 0 && (
          searchQuery.trim() ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              No messages match your search
            </div>
          ) : (
            <EmptyState channelName={channelName} />
          )
        )}

        {feedState === "ready" && filtered.length > 0 && (
          <>
            {groups.map((group, index) => {
              const groupDate = new Date(group.timestamp);
              const prevGroup = index > 0 ? groups[index - 1] : null;
              const prevDate = prevGroup
                ? new Date(prevGroup.messages[prevGroup.messages.length - 1].created_at)
                : null;
              const showDateSep = !prevDate || !isSameDay(groupDate, prevDate);

              return (
                <React.Fragment key={`${group.senderId}-${group.timestamp}-${index}`}>
                  {showDateSep && <DateSeparator date={groupDate} />}
                  <div
                    ref={(el) => {
                      group.messages.forEach((m) => {
                        if (el) messageRefs.current.set(m.id, el as HTMLDivElement);
                      });
                    }}
                  >
                    <MessageGroupComponent
                      group={group}
                      currentUserId={currentUserId}
                      onReply={onReply}
                      onPin={onPin}
                      onOpenThread={onOpenThread}
                    />
                  </div>
                </React.Fragment>
              );
            })}
            {/* Bottom padding so last message clears the composer */}
            <div className="h-2 flex-shrink-0" />
          </>
        )}
      </div>
    </>
  );
}
