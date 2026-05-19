"use client";

import MessageBubble from "./MessageBubble";
import type { MessageGroup as MessageGroupType, EnrichedMessage } from "../types";

export interface MessageGroupProps {
  group: MessageGroupType;
  isCurrentUser: boolean;
  onReply: (message: EnrichedMessage) => void;
  onPin: (messageId: string) => void;
}

export default function MessageGroup({ group, isCurrentUser, onReply, onPin }: MessageGroupProps) {
  return (
    <div className={`flex flex-col mb-3 ${isCurrentUser ? "items-end" : "items-start"}`}>
      {/* Sender + timestamp — shown once per group */}
      <div className={`flex items-baseline gap-2 mb-1 px-1 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
        <span className="text-xs font-semibold text-slate-700">{group.senderName}</span>
      </div>

      <div className={`flex flex-col gap-0.5 w-full ${isCurrentUser ? "items-end" : "items-start"}`}>
        {group.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={isCurrentUser}
            onReply={onReply}
            onPin={onPin}
          />
        ))}
      </div>
    </div>
  );
}
