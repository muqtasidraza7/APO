"use client";

import { useState } from "react";
import { Reply, Pin, PinOff, Download, FileText, MessageSquare } from "lucide-react";
import type { EnrichedMessage } from "../types";
import { formatTimestamp, getInitials, getAvatarColor } from "../lib";

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@\S+(?:\s\S+)?)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className="font-semibold text-indigo-600 bg-indigo-50 rounded px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function FileAttachment({ url, name, type }: { url: string; name: string | null; type: string | null }) {
  const isImage = type?.startsWith("image/");
  const displayName = name || "Attachment";

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={url}
          alt={displayName}
          className="max-w-[300px] max-h-[240px] rounded-xl object-cover border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
    >
      <FileText size={14} className="text-slate-500 flex-shrink-0" />
      <span className="truncate max-w-[220px]">{displayName}</span>
      <Download size={12} className="text-slate-400 flex-shrink-0 ml-auto" />
    </a>
  );
}

export interface MessageBubbleProps {
  message: EnrichedMessage;
  currentUserId: string;
  isFirstInGroup: boolean;
  onReply: (message: EnrichedMessage) => void;
  onPin: (messageId: string) => void;
  onOpenThread: (message: EnrichedMessage) => void;
}

export default function MessageBubble({
  message,
  currentUserId,
  isFirstInGroup,
  onReply,
  onPin,
  onOpenThread,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const isCurrentUser = message.sender_id === currentUserId;
  const avatarColor = getAvatarColor(message.sender_id);
  const initials = getInitials(message.sender.full_name);

  return (
    <div
      className="flex gap-3 px-4 py-0.5 hover:bg-slate-50/70 transition-colors relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar or timestamp spacer */}
      <div className="w-9 flex-shrink-0 pt-0.5 flex items-start justify-center">
        {isFirstInGroup ? (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        ) : (
          <span
            className={`text-[9px] text-slate-300 pt-1.5 transition-opacity ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {formatTimestamp(message.created_at)}
          </span>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-bold text-slate-800">
              {message.sender.full_name}
            </span>
            {isCurrentUser && (
              <span className="text-[10px] text-slate-400 font-normal">(you)</span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatTimestamp(message.created_at)}
            </span>
            {message.is_pinned && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                <Pin size={7} /> Pinned
              </span>
            )}
          </div>
        )}

        {/* Reply preview bar */}
        {message.reply_preview && (
          <div className="flex items-start gap-1.5 mb-1.5 pl-2.5 border-l-2 border-indigo-300 bg-indigo-50/40 rounded-r-lg py-1">
            <div className="text-xs text-slate-500 leading-snug">
              <span className="font-semibold text-indigo-700 mr-1">
                {message.reply_preview.sender_name}:
              </span>
              <span>
                {message.reply_preview.content.slice(0, 100)}
                {message.reply_preview.content.length > 100 ? "…" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Message text */}
        {message.content && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
            {renderContent(message.content)}
          </p>
        )}

        {/* File attachment */}
        {message.file_url && (
          <FileAttachment
            url={message.file_url}
            name={message.file_name}
            type={message.file_type}
          />
        )}

        {/* Thread reply count badge */}
        {(message.thread_reply_count ?? 0) > 0 && (
          <button
            onClick={() => onOpenThread(message)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors"
          >
            <MessageSquare size={12} className="flex-shrink-0" />
            <span>
              {message.thread_reply_count} {message.thread_reply_count === 1 ? "reply" : "replies"}
            </span>
            <span className="text-slate-400 font-normal">→ View thread</span>
          </button>
        )}
      </div>

      {/* Floating hover action toolbar */}
      {hovered && (
        <div className="absolute right-4 -top-4 flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-lg px-1 py-1 z-10">
          <button
            onClick={() => onOpenThread(message)}
            title="Reply in thread"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={() => onReply(message)}
            title="Reply in channel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Reply size={14} />
          </button>
          <div className="w-px h-4 bg-slate-100 mx-0.5" />
          <button
            onClick={() => onPin(message.id)}
            title={message.is_pinned ? "Unpin" : "Pin"}
            className={`p-1.5 rounded-lg transition-colors ${
              message.is_pinned
                ? "text-amber-500 hover:bg-amber-50"
                : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
            }`}
          >
            {message.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}
