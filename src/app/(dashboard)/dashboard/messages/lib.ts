import type { EnrichedMessage, MessageGroup, RawMessage } from "./types";

const GROUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Groups consecutive messages from the same sender within a 5-minute window.
 * Input messages must be sorted ascending by created_at.
 */
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
        if (
            last &&
            last.senderId === msg.sender_id &&
            msgTime - lastTime <= windowMs
        ) {
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

/**
 * Resolves a sender's display name from a map.
 * Returns "Unknown Member" if the key is missing, the value is null, or the value is blank.
 */
export function resolveSenderName(
    senderId: string,
    senderMap: Map<string, string | null>
): string {
    if (!senderMap.has(senderId)) return "Unknown Member";
    const name = senderMap.get(senderId);
    if (name == null || name.trim() === "") return "Unknown Member";
    return name;
}

/**
 * Returns true if content is non-empty after trimming and total length ≤ 4000.
 */
export function isValidContent(content: string): boolean {
    return content.trim().length > 0 && content.length <= 4000;
}

/**
 * Truncates a channel/project name at 25 characters, appending "..." if longer.
 */
export function truncateChannelName(name: string, maxLength: number = 25): string {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + "...";
}

/**
 * Appends an incoming message to the array only if its id is not already present.
 */
export function appendWithDedup(
    messages: EnrichedMessage[],
    incoming: EnrichedMessage
): EnrichedMessage[] {
    if (messages.some((m) => m.id === incoming.id)) return messages;
    return [...messages, incoming];
}

/**
 * Returns "right" if senderId equals currentUserId, "left" otherwise.
 */
export function getMessageAlignment(
    senderId: string,
    currentUserId: string
): "left" | "right" {
    return senderId === currentUserId ? "right" : "left";
}

/**
 * Sorts messages ascending by created_at and limits to 50.
 */
export function applyHistoryFilter(messages: RawMessage[]): RawMessage[] {
    return [...messages]
        .sort(
            (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        .slice(0, 50);
}
