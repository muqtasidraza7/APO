import type { EnrichedMessage, MessageGroup, RawMessage } from "./types";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const AVATAR_COLORS = [
  "#7C3AED", "#4F46E5", "#0891B2", "#059669",
  "#D97706", "#DC2626", "#9333EA", "#2563EB",
];

export function groupMessages(
  messages: EnrichedMessage[],
  windowMs: number = GROUP_WINDOW_MS
): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const msgTime = new Date(msg.created_at).getTime();
    const lastTime = last
      ? new Date(last.messages[last.messages.length - 1].created_at).getTime()
      : -Infinity;
    if (last && last.senderId === msg.sender_id && msgTime - lastTime <= windowMs) {
      last.messages.push(msg);
    } else {
      groups.push({
        senderId: msg.sender_id,
        senderName: msg.sender.full_name,
        timestamp: msg.created_at,
        messages: [msg],
      });
    }
  }
  return groups;
}

export function resolveSenderName(
  senderId: string,
  senderMap: Map<string, string | null>
): string {
  if (!senderMap.has(senderId)) return "Unknown Member";
  const name = senderMap.get(senderId);
  if (name == null || name.trim() === "") return "Unknown Member";
  return name;
}

export function isValidContent(content: string): boolean {
  return content.trim().length > 0 && content.length <= 4000;
}

export function truncateChannelName(name: string, maxLength: number = 22): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "…";
}

export function appendWithDedup(
  messages: EnrichedMessage[],
  incoming: EnrichedMessage
): EnrichedMessage[] {
  if (messages.some((m) => m.id === incoming.id)) return messages;
  return [...messages, incoming];
}

// Kept for backward-compat with existing tests
export function getMessageAlignment(
  senderId: string,
  currentUserId: string
): "left" | "right" {
  return senderId === currentUserId ? "right" : "left";
}

export function applyHistoryFilter(messages: RawMessage[]): RawMessage[] {
  return [...messages]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 50);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function formatDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
