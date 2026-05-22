"use client";

import MessageBubble from "./MessageBubble";
import type { MessageGroup as MessageGroupType, EnrichedMessage } from "../types";

export interface MessageGroupProps {
  group: MessageGroupType;
  currentUserId: string;
  onReply: (message: EnrichedMessage) => void;
  onPin: (messageId: string) => void;
  onOpenThread: (message: EnrichedMessage) => void;
}

export default function MessageGroup({
  group,
  currentUserId,
  onReply,
  onPin,
  onOpenThread,
}: MessageGroupProps) {
  return (
    <div className="py-0.5">
      {group.messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          isFirstInGroup={index === 0}
          onReply={onReply}
          onPin={onPin}
          onOpenThread={onOpenThread}
        />
      ))}
    </div>
  );
}
