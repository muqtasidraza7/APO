"use client";

import { useState } from "react";
import { Reply, Pin, PinOff, Download, FileText, Image as ImageIcon } from "lucide-react";
import type { EnrichedMessage } from "../types";

export interface MessageBubbleProps {
  message: EnrichedMessage;
  isCurrentUser: boolean;
  onReply: (message: EnrichedMessage) => void;
  onPin: (messageId: string) => void;
}

// Render content with @mention highlighting
function renderContent(content: string) {
  if (!content) return null;
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-indigo-300 bg-indigo-500/20 px-0.5 rounded">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function renderContentLight(content: string) {
  if (!content) return null;
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-indigo-600">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function FileAttachment({ url, name, type, isCurrentUser }: { url: string; name: string | null; type: string | null; isCurrentUser: boolean }) {
  const isImage = type?.startsWith("image/");
  const displayName = name || "Attachment";

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={url}
          alt={displayName}
          className="max-w-[260px] max-h-[200px] rounded-xl object-cover border border-white/20 hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
        isCurrentUser
          ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <FileText size={14} className="flex-shrink-0" />
      <span className="truncate max-w-[180px]">{displayName}</span>
      <Download size={12} className="flex-shrink-0 ml-auto" />
    </a>
  );
}

export default function MessageBubble({ message, isCurrentUser, onReply, onPin }: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`flex ${isCurrentUser ? "flex-row-reverse" : "flex-row"} mb-1 group items-end gap-1`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover action bar */}
      <div
        className={`flex items-center gap-0.5 mb-0.5 transition-opacity ${
          hovered ? "opacity-100" : "opacity-0"
        } ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
      >
        <button
          onClick={() => onReply(message)}
          title="Reply"
          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
        >
          <Reply size={12} />
        </button>
        <button
          onClick={() => onPin(message.id)}
          title={message.is_pinned ? "Unpin" : "Pin"}
          className={`p-1.5 rounded-lg bg-white border shadow-sm transition-colors ${
            message.is_pinned
              ? "border-amber-300 text-amber-500 hover:text-amber-600"
              : "border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200"
          }`}
        >
          {message.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
      </div>

      {/* Bubble */}
      <div className="max-w-[70%]">
        {/* Reply preview */}
        {message.reply_preview && (
          <div
            className={`flex items-start gap-2 mb-1 px-2.5 py-1.5 rounded-xl text-xs border-l-2 ${
              isCurrentUser
                ? "bg-indigo-700/50 border-indigo-300/50 text-indigo-200"
                : "bg-slate-100 border-slate-300 text-slate-500"
            }`}
          >
            <Reply size={10} className="flex-shrink-0 mt-0.5 opacity-60" />
            <div className="min-w-0">
              <span className="font-semibold mr-1 opacity-90">{message.reply_preview.sender_name}</span>
              <span className="opacity-70 truncate block">{message.reply_preview.content.slice(0, 80)}{message.reply_preview.content.length > 80 ? "…" : ""}</span>
            </div>
          </div>
        )}

        {/* Main bubble */}
        <div
          className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words relative ${
            isCurrentUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
          }`}
        >
          {/* Content */}
          {message.content && (
            <span>
              {isCurrentUser ? renderContent(message.content) : renderContentLight(message.content)}
            </span>
          )}

          {/* File attachment */}
          {message.file_url && (
            <FileAttachment
              url={message.file_url}
              name={message.file_name}
              type={message.file_type}
              isCurrentUser={isCurrentUser}
            />
          )}

          {/* Pin indicator */}
          {message.is_pinned && (
            <span className={`ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold ${
              isCurrentUser ? "text-amber-300" : "text-amber-500"
            }`}>
              <Pin size={8} />
            </span>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] text-slate-400 mt-0.5 ${isCurrentUser ? "text-right" : "text-left"}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
