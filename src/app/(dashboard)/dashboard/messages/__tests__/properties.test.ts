import fc from "fast-check";
import {
    groupMessages,
    resolveSenderName,
    isValidContent,
    appendWithDedup,
    getMessageAlignment,
    applyHistoryFilter,
    truncateChannelName,
} from "../lib";
import type { EnrichedMessage, RawMessage } from "../types";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const MIN_TS = new Date("2020-01-01").getTime();
const MAX_TS = new Date("2030-01-01").getTime();

/** Generates a valid ISO timestamp string using integer timestamps to avoid shrinking issues */
const arbitraryISODate = (): fc.Arbitrary<string> =>
    fc.integer({ min: MIN_TS, max: MAX_TS }).map((ms) =>
        new Date(ms).toISOString()
    );

/** Generates a UUID-like string */
const arbitraryUUID = (): fc.Arbitrary<string> =>
    fc.uuid();

/** Generates an EnrichedMessage with a given senderId and timestamp */
const arbitraryEnrichedMessage = (
    overrides?: Partial<EnrichedMessage>
): fc.Arbitrary<EnrichedMessage> =>
    fc
        .record({
            id: arbitraryUUID(),
            workspace_id: arbitraryUUID(),
            project_id: fc.option(arbitraryUUID(), { nil: null }),
            sender_id: arbitraryUUID(),
            receiver_id: fc.constant(null),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            created_at: arbitraryISODate(),
        })
        .map((msg) => ({
            ...msg,
            sender: {
                user_id: msg.sender_id,
                full_name: "Test User",
            },
            ...overrides,
        }));

/** Generates an array of EnrichedMessages sorted ascending by created_at */
const arbitrarySortedMessages = (): fc.Arbitrary<EnrichedMessage[]> =>
    fc
        .array(arbitraryEnrichedMessage(), { minLength: 1, maxLength: 50 })
        .map((msgs) =>
            [...msgs].sort(
                (a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
        );

/** Generates a RawMessage */
const arbitraryRawMessage = (): fc.Arbitrary<RawMessage> =>
    fc.record({
        id: arbitraryUUID(),
        workspace_id: arbitraryUUID(),
        project_id: fc.option(arbitraryUUID(), { nil: null }),
        sender_id: arbitraryUUID(),
        receiver_id: fc.constant(null),
        content: fc.string({ minLength: 1, maxLength: 100 }),
        created_at: arbitraryISODate(),
    });

// ---------------------------------------------------------------------------
// Property 5 — Message grouping invariant
// ---------------------------------------------------------------------------

test("Property 5 — groupMessages: all messages in a group share senderId and are within 5 minutes", () => {
    fc.assert(
        fc.property(arbitrarySortedMessages(), (messages) => {
            const groups = groupMessages(messages);
            const GROUP_WINDOW_MS = 5 * 60 * 1000;

            for (const group of groups) {
                // (a) Every message in the group shares the group's senderId
                for (const msg of group.messages) {
                    if (msg.sender_id !== group.senderId) return false;
                }

                // (b) Consecutive messages within a group are ≤ 5 minutes apart
                for (let i = 1; i < group.messages.length; i++) {
                    const prev = new Date(group.messages[i - 1].created_at).getTime();
                    const curr = new Date(group.messages[i].created_at).getTime();
                    if (curr - prev > GROUP_WINDOW_MS) return false;
                }
            }

            // (c) No two adjacent groups have the same senderId with a gap ≤ 5 minutes
            for (let i = 1; i < groups.length; i++) {
                const prevGroup = groups[i - 1];
                const currGroup = groups[i];
                if (prevGroup.senderId === currGroup.senderId) {
                    const lastMsgOfPrev =
                        prevGroup.messages[prevGroup.messages.length - 1];
                    const firstMsgOfCurr = currGroup.messages[0];
                    const gap =
                        new Date(firstMsgOfCurr.created_at).getTime() -
                        new Date(lastMsgOfPrev.created_at).getTime();
                    if (gap <= GROUP_WINDOW_MS) return false;
                }
            }

            return true;
        }),
        { numRuns: 100 }
    );
});

// ---------------------------------------------------------------------------
// Property 6 — Sender name resolution
// ---------------------------------------------------------------------------

test("Property 6 — resolveSenderName: returns map value if non-null/non-blank, else 'Unknown Member'", () => {
    fc.assert(
        fc.property(
            arbitraryUUID(),
            fc.oneof(
                fc.constant(null),
                fc.constant(""),
                fc.string({ minLength: 0, maxLength: 0 }),
                fc.stringMatching(/^\s+$/), // whitespace-only
                fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0)
            ),
            (senderId, nameValue) => {
                const senderMap = new Map<string, string | null>([[senderId, nameValue]]);
                const result = resolveSenderName(senderId, senderMap);

                if (nameValue != null && nameValue.trim().length > 0) {
                    return result === nameValue;
                } else {
                    return result === "Unknown Member";
                }
            }
        ),
        { numRuns: 100 }
    );
});

test("Property 6b — resolveSenderName: returns 'Unknown Member' when key is missing", () => {
    fc.assert(
        fc.property(arbitraryUUID(), arbitraryUUID(), (senderId, otherId) => {
            fc.pre(senderId !== otherId);
            const senderMap = new Map<string, string | null>([[otherId, "Some Name"]]);
            return resolveSenderName(senderId, senderMap) === "Unknown Member";
        }),
        { numRuns: 100 }
    );
});

// ---------------------------------------------------------------------------
// Property 7 — Whitespace content rejection
// ---------------------------------------------------------------------------

test("Property 7 — isValidContent: returns false for whitespace-only strings", () => {
    fc.assert(
        fc.property(
            fc.stringMatching(/^\s+$/),
            (whitespaceStr) => {
                return isValidContent(whitespaceStr) === false;
            }
        ),
        { numRuns: 100 }
    );
});

// ---------------------------------------------------------------------------
// Property 8 — Realtime deduplication
// ---------------------------------------------------------------------------

test("Property 8 — appendWithDedup: does not append a message whose id already exists", () => {
    fc.assert(
        fc.property(
            fc.array(arbitraryEnrichedMessage(), { minLength: 1, maxLength: 20 }),
            fc.integer({ min: 0, max: 19 }),
            (messages, indexSeed) => {
                const index = indexSeed % messages.length;
                const duplicate = { ...messages[index] };
                const result = appendWithDedup(messages, duplicate);
                return result.length === messages.length;
            }
        ),
        { numRuns: 100 }
    );
});

// ---------------------------------------------------------------------------
// Property 10 — Message bubble alignment
// ---------------------------------------------------------------------------

test("Property 10 — getMessageAlignment: returns 'right' iff senderId equals currentUserId", () => {
    fc.assert(
        fc.property(arbitraryUUID(), arbitraryUUID(), (id1, id2) => {
            const alignment = getMessageAlignment(id1, id2);
            if (id1 === id2) {
                return alignment === "right";
            } else {
                return alignment === "left";
            }
        }),
        { numRuns: 100 }
    );
});

// ---------------------------------------------------------------------------
// Property 11 — History limit and ordering
// ---------------------------------------------------------------------------

test("Property 11 — applyHistoryFilter: returns at most 50 messages ordered ascending by created_at", () => {
    fc.assert(
        fc.property(
            fc.array(arbitraryRawMessage(), { minLength: 0, maxLength: 100 }),
            (messages) => {
                const result = applyHistoryFilter(messages);

                // At most 50
                if (result.length > 50) return false;

                // Ordered ascending by created_at
                for (let i = 1; i < result.length; i++) {
                    const prev = new Date(result[i - 1].created_at).getTime();
                    const curr = new Date(result[i].created_at).getTime();
                    if (curr < prev) return false;
                }

                return true;
            }
        ),
        { numRuns: 100 }
    );
});

// ---------------------------------------------------------------------------
// Property 12 — Project name truncation
// ---------------------------------------------------------------------------

test("Property 12 — truncateChannelName: strings > 25 chars end with '...' and prefix equals first 25 chars", () => {
    fc.assert(
        fc.property(
            fc.string({ minLength: 26, maxLength: 200 }),
            (name) => {
                const result = truncateChannelName(name);
                return (
                    result.endsWith("...") &&
                    result.slice(0, 25) === name.slice(0, 25)
                );
            }
        ),
        { numRuns: 100 }
    );
});
