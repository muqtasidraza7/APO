import {
    groupMessages,
    resolveSenderName,
    isValidContent,
    truncateChannelName,
    appendWithDedup,
    getMessageAlignment,
    applyHistoryFilter,
} from "../lib";
import type { EnrichedMessage, RawMessage } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(
    overrides: Partial<EnrichedMessage> & { id: string; sender_id: string; created_at: string }
): EnrichedMessage {
    return {
        workspace_id: "ws-1",
        project_id: null,
        receiver_id: null,
        content: "Hello",
        sender: {
            user_id: overrides.sender_id,
            full_name: "Test User",
        },
        ...overrides,
    };
}

function makeRawMessage(
    overrides: Partial<RawMessage> & { id: string; created_at: string }
): RawMessage {
    return {
        workspace_id: "ws-1",
        project_id: null,
        sender_id: "user-1",
        receiver_id: null,
        content: "Hello",
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// groupMessages
// ---------------------------------------------------------------------------

describe("groupMessages", () => {
    test("empty array returns []", () => {
        expect(groupMessages([])).toEqual([]);
    });

    test("single message returns one group", () => {
        const msg = makeMessage({ id: "1", sender_id: "alice", created_at: "2024-01-01T10:00:00Z" });
        const groups = groupMessages([msg]);
        expect(groups).toHaveLength(1);
        expect(groups[0].senderId).toBe("alice");
        expect(groups[0].messages).toHaveLength(1);
    });

    test("two consecutive messages from same sender within 5 min are in one group", () => {
        const msg1 = makeMessage({ id: "1", sender_id: "alice", created_at: "2024-01-01T10:00:00Z" });
        const msg2 = makeMessage({ id: "2", sender_id: "alice", created_at: "2024-01-01T10:04:00Z" });
        const groups = groupMessages([msg1, msg2]);
        expect(groups).toHaveLength(1);
        expect(groups[0].messages).toHaveLength(2);
    });

    test("two messages from same sender > 5 min apart are in separate groups", () => {
        const msg1 = makeMessage({ id: "1", sender_id: "alice", created_at: "2024-01-01T10:00:00Z" });
        const msg2 = makeMessage({ id: "2", sender_id: "alice", created_at: "2024-01-01T10:06:00Z" });
        const groups = groupMessages([msg1, msg2]);
        expect(groups).toHaveLength(2);
    });

    test("messages from different senders are always in separate groups", () => {
        const msg1 = makeMessage({ id: "1", sender_id: "alice", created_at: "2024-01-01T10:00:00Z" });
        const msg2 = makeMessage({ id: "2", sender_id: "bob", created_at: "2024-01-01T10:01:00Z" });
        const groups = groupMessages([msg1, msg2]);
        expect(groups).toHaveLength(2);
        expect(groups[0].senderId).toBe("alice");
        expect(groups[1].senderId).toBe("bob");
    });
});

// ---------------------------------------------------------------------------
// resolveSenderName
// ---------------------------------------------------------------------------

describe("resolveSenderName", () => {
    test("returns full_name when present and non-blank", () => {
        const map = new Map<string, string | null>([["user-1", "Alice Smith"]]);
        expect(resolveSenderName("user-1", map)).toBe("Alice Smith");
    });

    test("returns 'Unknown Member' when key is missing", () => {
        const map = new Map<string, string | null>();
        expect(resolveSenderName("user-1", map)).toBe("Unknown Member");
    });

    test("returns 'Unknown Member' when value is null", () => {
        const map = new Map<string, string | null>([["user-1", null]]);
        expect(resolveSenderName("user-1", map)).toBe("Unknown Member");
    });

    test("returns 'Unknown Member' when value is empty string", () => {
        const map = new Map<string, string | null>([["user-1", ""]]);
        expect(resolveSenderName("user-1", map)).toBe("Unknown Member");
    });

    test("returns 'Unknown Member' when value is whitespace-only", () => {
        const map = new Map<string, string | null>([["user-1", "   "]]);
        expect(resolveSenderName("user-1", map)).toBe("Unknown Member");
    });
});

// ---------------------------------------------------------------------------
// isValidContent
// ---------------------------------------------------------------------------

describe("isValidContent", () => {
    test("returns false for empty string", () => {
        expect(isValidContent("")).toBe(false);
    });

    test("returns false for whitespace-only string", () => {
        expect(isValidContent("   ")).toBe(false);
        expect(isValidContent("\t\n")).toBe(false);
    });

    test("returns true for single character", () => {
        expect(isValidContent("a")).toBe(true);
    });

    test("returns false for string of length 4001", () => {
        expect(isValidContent("a".repeat(4001))).toBe(false);
    });

    test("returns true for string of length 4000", () => {
        expect(isValidContent("a".repeat(4000))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// truncateChannelName
// ---------------------------------------------------------------------------

describe("truncateChannelName", () => {
    test("returns unchanged string when ≤ 25 chars", () => {
        expect(truncateChannelName("Short name")).toBe("Short name");
        expect(truncateChannelName("Exactly twenty-five char!")).toBe("Exactly twenty-five char!");
    });

    test("returns 25-char prefix + '...' when > 25 chars", () => {
        const name = "This is a very long project name that exceeds the limit";
        const result = truncateChannelName(name);
        expect(result).toBe(name.slice(0, 25) + "...");
    });

    test("handles exactly 25 chars without truncation", () => {
        const name = "a".repeat(25);
        expect(truncateChannelName(name)).toBe(name);
    });

    test("handles exactly 26 chars with truncation", () => {
        const name = "a".repeat(26);
        expect(truncateChannelName(name)).toBe("a".repeat(25) + "...");
    });
});

// ---------------------------------------------------------------------------
// appendWithDedup
// ---------------------------------------------------------------------------

describe("appendWithDedup", () => {
    const msg1 = makeMessage({ id: "1", sender_id: "alice", created_at: "2024-01-01T10:00:00Z" });
    const msg2 = makeMessage({ id: "2", sender_id: "bob", created_at: "2024-01-01T10:01:00Z" });

    test("appends new message", () => {
        const result = appendWithDedup([msg1], msg2);
        expect(result).toHaveLength(2);
        expect(result[1].id).toBe("2");
    });

    test("does not append duplicate id", () => {
        const duplicate = { ...msg1 };
        const result = appendWithDedup([msg1], duplicate);
        expect(result).toHaveLength(1);
    });

    test("returns new array reference", () => {
        const original = [msg1];
        const result = appendWithDedup(original, msg2);
        expect(result).not.toBe(original);
    });
});

// ---------------------------------------------------------------------------
// getMessageAlignment
// ---------------------------------------------------------------------------

describe("getMessageAlignment", () => {
    test("returns 'right' for same id", () => {
        expect(getMessageAlignment("user-1", "user-1")).toBe("right");
    });

    test("returns 'left' for different ids", () => {
        expect(getMessageAlignment("user-1", "user-2")).toBe("left");
    });
});

// ---------------------------------------------------------------------------
// applyHistoryFilter
// ---------------------------------------------------------------------------

describe("applyHistoryFilter", () => {
    test("returns empty array for empty input", () => {
        expect(applyHistoryFilter([])).toEqual([]);
    });

    test("returns all messages when ≤ 50", () => {
        const msgs = Array.from({ length: 10 }, (_, i) =>
            makeRawMessage({ id: `${i}`, created_at: `2024-01-01T10:0${i}:00Z` })
        );
        expect(applyHistoryFilter(msgs)).toHaveLength(10);
    });

    test("returns exactly 50 when > 50", () => {
        const msgs = Array.from({ length: 60 }, (_, i) =>
            makeRawMessage({
                id: `${i}`,
                created_at: new Date(Date.UTC(2024, 0, 1, 10, i, 0)).toISOString(),
            })
        );
        expect(applyHistoryFilter(msgs)).toHaveLength(50);
    });

    test("result is sorted ascending by created_at", () => {
        const msgs = [
            makeRawMessage({ id: "3", created_at: "2024-01-01T10:03:00Z" }),
            makeRawMessage({ id: "1", created_at: "2024-01-01T10:01:00Z" }),
            makeRawMessage({ id: "2", created_at: "2024-01-01T10:02:00Z" }),
        ];
        const result = applyHistoryFilter(msgs);
        expect(result[0].id).toBe("1");
        expect(result[1].id).toBe("2");
        expect(result[2].id).toBe("3");
    });
});
