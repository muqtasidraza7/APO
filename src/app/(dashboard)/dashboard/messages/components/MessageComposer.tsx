"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Send, AlertCircle, Paperclip, X, Reply, Loader2, FileText } from "lucide-react";
import { isValidContent, getInitials, getAvatarColor } from "../lib";
import type { EnrichedMessage, SendState, TeamMember } from "../types";

export interface MessageComposerProps {
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
}

export default function MessageComposer({
  channelName,
  sendState,
  sendError,
  replyTo,
  teamMembers,
  workspaceId,
  onSend,
  onCancelReply,
}: MessageComposerProps) {
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
          .slice(0, 6)
      : [];

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSending, mentionQuery, pendingFile]
  );

  const handleSend = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed && !pendingFile) return;
    await onSend(trimmed, replyTo?.id, pendingFile?.url, pendingFile?.name, pendingFile?.type);
    if (textareaRef.current) {
      textareaRef.current.value = "";
      resizeTextarea();
    }
    setPendingFile(null);
    setMentionQuery(null);
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
      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <Reply size={13} className="text-indigo-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-indigo-700">
              {replyTo.sender.full_name}
            </span>
            <span className="text-xs text-slate-500 ml-1.5 truncate">
              {replyTo.content.slice(0, 60)}
              {replyTo.content.length > 60 ? "…" : ""}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
          {pendingFile.type.startsWith("image/") ? (
            <img
              src={pendingFile.url}
              alt={pendingFile.name}
              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText size={16} className="text-slate-500" />
            </div>
          )}
          <span className="text-xs text-slate-600 font-medium truncate flex-1">
            {pendingFile.name}
          </span>
          <button
            onClick={() => setPendingFile(null)}
            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="px-4 py-3">
        {sendError && (
          <div
            role="alert"
            className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs"
          >
            <AlertCircle size={13} className="flex-shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        <div className="relative">
          {/* @mention dropdown */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-1.5 min-w-[220px]">
              <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Mention
              </p>
              {filteredMembers.map((member) => (
                <button
                  key={member.user_id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 text-sm text-left transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(member.user_id) }}
                  >
                    {getInitials(member.full_name)}
                  </div>
                  <span className="text-slate-700 font-medium text-sm">{member.full_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || uploadingFile}
              title="Attach file"
              className="flex-shrink-0 p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
            >
              {uploadingFile ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Paperclip size={17} />
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
              placeholder={`Message #${channelName} — Shift+Enter for new line, @ to mention`}
              className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 hover:bg-white transition-colors"
              style={{ minHeight: "42px", maxHeight: "160px" }}
            />

            <button
              onClick={() => handleSend(textareaRef.current?.value ?? "")}
              disabled={isSending || (!textareaRef.current?.value?.trim() && !pendingFile)}
              className="flex-shrink-0 p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              {isSending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-right">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
