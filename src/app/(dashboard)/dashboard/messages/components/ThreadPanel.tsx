"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
  Reply,
  Pin,
  PinOff,
  FileText,
  Download,
  Paperclip,
  Send,
} from "lucide-react";
import type {
  EnrichedMessage,
  FeedState,
  SendState,
  TeamMember,
} from "../types";
import {
  getInitials,
  getAvatarColor,
  formatTimestamp,
  formatDateSeparator,
  isSameDay,
  isValidContent,
  groupMessages,
} from "../lib";

// ── shared helpers ──────────────────────────────────────────────────────────

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

function Avatar({ name, userId, size = 8 }: { name: string; userId: string; size?: number }) {
  const color = getAvatarColor(userId);
  const initials = getInitials(name);
  const sizeClass = size === 8 ? "w-8 h-8" : "w-9 h-9";
  return (
    <div
      className={`${sizeClass} rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function FileBlock({
  url,
  name,
  type,
}: {
  url: string;
  name: string | null;
  type: string | null;
}) {
  const isImage = type?.startsWith("image/");
  const displayName = name || "Attachment";
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={url}
          alt={displayName}
          className="max-w-[240px] max-h-[180px] rounded-xl object-cover border border-slate-200 hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 mt-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
    >
      <FileText size={13} className="flex-shrink-0" />
      <span className="truncate max-w-[160px]">{displayName}</span>
      <Download size={11} className="flex-shrink-0 ml-auto" />
    </a>
  );
}

// ── ThreadMessage ───────────────────────────────────────────────────────────

function ThreadMessage({
  message,
  isFirstInGroup,
  currentUserId,
  onReply,
  onPin,
}: {
  message: EnrichedMessage;
  isFirstInGroup: boolean;
  currentUserId: string;
  onReply: (m: EnrichedMessage) => void;
  onPin: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex gap-2.5 px-4 py-0.5 hover:bg-slate-50/70 transition-colors relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar or timestamp */}
      <div className="w-8 flex-shrink-0 pt-0.5 flex items-start justify-center">
        {isFirstInGroup ? (
          <Avatar name={message.sender.full_name} userId={message.sender_id} size={8} />
        ) : (
          <span
            className={`text-[9px] text-slate-300 pt-1 transition-opacity ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {formatTimestamp(message.created_at)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-bold text-slate-800">
              {message.sender.full_name}
            </span>
            {message.sender_id === currentUserId && (
              <span className="text-[10px] text-slate-400">(you)</span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatTimestamp(message.created_at)}
            </span>
          </div>
        )}

        {message.reply_preview && (
          <div className="flex items-start gap-1.5 mb-1.5 pl-2.5 border-l-2 border-indigo-300 bg-indigo-50/40 rounded-r-lg py-1">
            <div className="text-xs text-slate-500 leading-snug">
              <span className="font-semibold text-indigo-700 mr-1">
                {message.reply_preview.sender_name}:
              </span>
              <span>
                {message.reply_preview.content.slice(0, 80)}
                {message.reply_preview.content.length > 80 ? "…" : ""}
              </span>
            </div>
          </div>
        )}

        {message.content && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
            {renderContent(message.content)}
          </p>
        )}

        {message.file_url && (
          <FileBlock url={message.file_url} name={message.file_name} type={message.file_type} />
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute right-3 -top-4 flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl shadow-lg px-1 py-1 z-10">
          <button
            onClick={() => onReply(message)}
            title="Reply"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Reply size={13} />
          </button>
          <div className="w-px h-3.5 bg-slate-100 mx-0.5" />
          <button
            onClick={() => onPin(message.id)}
            title={message.is_pinned ? "Unpin" : "Pin"}
            className={`p-1.5 rounded-lg transition-colors ${
              message.is_pinned
                ? "text-amber-500 hover:bg-amber-50"
                : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
            }`}
          >
            {message.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ThreadComposer ──────────────────────────────────────────────────────────

function ThreadComposer({
  channelName,
  sendState,
  sendError,
  replyTo,
  teamMembers,
  workspaceId,
  onSend,
  onCancelReply,
}: {
  channelName: string;
  sendState: SendState;
  sendError: string | null;
  replyTo: EnrichedMessage | null;
  teamMembers: TeamMember[];
  workspaceId: string;
  onSend: (
    content: string,
    replyToId?: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string
  ) => Promise<void>;
  onCancelReply: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSending = sendState === "sending";

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  const filteredMembers =
    mentionQuery !== null
      ? teamMembers
          .filter((m) => m.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 5)
      : [];

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const insertMention = useCallback(
    (member: TeamMember) => {
      const el = textareaRef.current;
      if (!el) return;
      const value = el.value;
      const atPos = value.lastIndexOf("@", el.selectionStart - 1);
      if (atPos === -1) return;
      const before = value.slice(0, atPos);
      const after = value.slice(el.selectionStart);
      const newValue = `${before}@${member.full_name} ${after}`;
      el.value = newValue;
      const newCursor = before.length + member.full_name.length + 2;
      el.setSelectionRange(newCursor, newCursor);
      setMentionQuery(null);
      resizeTextarea();
      el.focus();
    },
    [resizeTextarea]
  );

  const handleInput = useCallback(() => {
    resizeTextarea();
    const el = textareaRef.current;
    if (!el) return;
    const textBeforeCursor = el.value.slice(0, el.selectionStart);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  }, [resizeTextarea]);

  const handleSend = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed && !pendingFile) return;
    await onSend(
      trimmed,
      replyTo?.id,
      pendingFile?.url,
      pendingFile?.name,
      pendingFile?.type
    );
    if (textareaRef.current) {
      textareaRef.current.value = "";
      resizeTextarea();
    }
    setPendingFile(null);
    setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && mentionQuery !== null) {
      setMentionQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mentionQuery !== null) return;
      const value = textareaRef.current?.value ?? "";
      if ((isValidContent(value) || pendingFile) && !isSending) {
        handleSend(value);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("workspaceId", workspaceId);
      const res = await fetch("/api/messages/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPendingFile({ url: data.url, name: data.name, type: data.type });
    } catch (err: any) {
      alert("File upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-slate-100 bg-white">
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <Reply size={12} className="text-indigo-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-indigo-700">
              {replyTo.sender.full_name}
            </span>
            <span className="text-xs text-slate-500 ml-1.5 truncate">
              {replyTo.content.slice(0, 50)}
              {replyTo.content.length > 50 ? "…" : ""}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {pendingFile && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
          {pendingFile.type.startsWith("image/") ? (
            <img
              src={pendingFile.url}
              alt={pendingFile.name}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
              <FileText size={14} className="text-slate-500" />
            </div>
          )}
          <span className="text-xs text-slate-600 font-medium truncate flex-1">
            {pendingFile.name}
          </span>
          <button
            onClick={() => setPendingFile(null)}
            className="p-1 text-slate-400 hover:text-red-500 rounded"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="px-3 py-3">
        {sendError && (
          <div className="flex items-center gap-1.5 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            <AlertCircle size={12} className="flex-shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        <div className="relative">
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 min-w-[180px]">
              <p className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-0.5">
                Mention
              </p>
              {filteredMembers.map((member) => (
                <button
                  key={member.user_id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 text-sm text-left"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(member.user_id) }}
                  >
                    {getInitials(member.full_name)}
                  </div>
                  <span className="text-slate-700 text-xs font-medium">{member.full_name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || uploadingFile}
              title="Attach file"
              className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
            >
              {uploadingFile ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Paperclip size={15} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip"
              className="hidden"
              onChange={handleFileChange}
            />

            <textarea
              ref={textareaRef}
              rows={1}
              disabled={isSending}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder={`Reply in thread — type @ to mention`}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 bg-slate-50"
              style={{ minHeight: "38px", maxHeight: "120px" }}
            />

            <button
              onClick={() => handleSend(textareaRef.current?.value ?? "")}
              disabled={isSending || (!textareaRef.current?.value?.trim() && !pendingFile)}
              className="flex-shrink-0 p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ThreadPanel ─────────────────────────────────────────────────────────────

export interface ThreadPanelProps {
  rootMessage: EnrichedMessage;
  messages: EnrichedMessage[];
  feedState: FeedState;
  sendState: SendState;
  sendError: string | null;
  currentUserId: string;
  teamMembers: TeamMember[];
  workspaceId: string;
  scrollRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onSend: (
    content: string,
    replyToId?: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string
  ) => Promise<void>;
  onPin: (messageId: string) => void;
}

export default function ThreadPanel({
  rootMessage,
  messages,
  feedState,
  sendState,
  sendError,
  currentUserId,
  teamMembers,
  workspaceId,
  scrollRef,
  onClose,
  onSend,
  onPin,
}: ThreadPanelProps) {
  const [replyTo, setReplyTo] = useState<EnrichedMessage | null>(null);

  const replyCount = messages.length;
  const rootAvatarColor = getAvatarColor(rootMessage.sender_id);
  const rootInitials = getInitials(rootMessage.sender.full_name);

  // Group thread messages for Slack-style display
  const groups = feedState === "ready" ? groupMessages(messages) : [];

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-indigo-500" />
          <span className="font-bold text-sm text-slate-800">Thread</span>
          {replyCount > 0 && (
            <span className="text-xs text-slate-400">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Root message */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: rootAvatarColor }}
          >
            {rootInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm font-bold text-slate-800">
                {rootMessage.sender.full_name}
              </span>
              {rootMessage.sender_id === currentUserId && (
                <span className="text-[10px] text-slate-400">(you)</span>
              )}
              <span className="text-[11px] text-slate-400">
                {formatTimestamp(rootMessage.created_at)}
              </span>
            </div>
            {rootMessage.content && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                {renderContent(rootMessage.content)}
              </p>
            )}
            {rootMessage.file_url && (
              <FileBlock
                url={rootMessage.file_url}
                name={rootMessage.file_name}
                type={rootMessage.file_type}
              />
            )}
          </div>
        </div>
      </div>

      {/* Thread replies */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {feedState === "loading" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={22} className="animate-spin text-indigo-400" />
          </div>
        )}
        {feedState === "error" && (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
            <AlertCircle size={22} className="text-red-400" />
            <p className="text-xs">Failed to load thread</p>
          </div>
        )}
        {feedState === "ready" && messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400 text-center px-6">
            <MessageSquare size={22} className="text-slate-300" />
            <p className="text-xs">No replies yet. Start the thread below!</p>
          </div>
        )}

        {feedState === "ready" && groups.length > 0 && (
          <>
            {groups.map((group, index) => {
              const groupDate = new Date(group.timestamp);
              const prevGroup = index > 0 ? groups[index - 1] : null;
              const prevDate = prevGroup
                ? new Date(prevGroup.messages[prevGroup.messages.length - 1].created_at)
                : null;
              const showDateSep = !prevDate || !isSameDay(groupDate, prevDate);

              return (
                <div key={`${group.senderId}-${group.timestamp}-${index}`}>
                  {showDateSep && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 bg-white border border-slate-100 rounded-full">
                        {formatDateSeparator(groupDate)}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  )}
                  {group.messages.map((message, msgIndex) => (
                    <ThreadMessage
                      key={message.id}
                      message={message}
                      isFirstInGroup={msgIndex === 0}
                      currentUserId={currentUserId}
                      onReply={setReplyTo}
                      onPin={onPin}
                    />
                  ))}
                </div>
              );
            })}
            <div className="h-2" />
          </>
        )}
      </div>

      {/* Thread composer */}
      <ThreadComposer
        channelName="thread"
        sendState={sendState}
        sendError={sendError}
        replyTo={replyTo}
        teamMembers={teamMembers}
        workspaceId={workspaceId}
        onSend={onSend}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
