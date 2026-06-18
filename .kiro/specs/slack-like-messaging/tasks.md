# Implementation Plan: Slack-Like Messaging

## Overview

This plan rebuilds the `/dashboard/messages` page and its supporting API routes from scratch, replacing the broken existing implementation with a polished, Slack-inspired real-time messaging experience. Tasks are ordered to establish the foundation first (types, pure functions, lib module), then API routes, then UI components, then realtime wiring, and finally tests.

---

## Tasks

- [x] 1. Install fast-check and set up test infrastructure
  - Install `fast-check` as a dev dependency: `npm install --save-dev fast-check`
  - Verify the project's test runner (Vitest or Jest) is configured and can run `.test.ts` files under `src/`
  - Create the test directory: `src/app/(dashboard)/dashboard/messages/__tests__/`
  - Confirm a basic smoke test runs successfully to validate the test setup
  - **Acceptance:** `fast-check` is importable in test files; test runner executes files in the `__tests__` directory without errors

- [x] 2. Create the shared types and lib module
  - Create `src/app/(dashboard)/dashboard/messages/types.ts` exporting all TypeScript interfaces from the design:
    - `RawMessage`, `EnrichedMessage`, `MessageGroup`
    - `ChannelType`, `ActiveChannel`
    - `FeedState`, `SendState`
    - `WorkspaceProject`, `TeamMember`
  - Create `src/app/(dashboard)/dashboard/messages/lib.ts` exporting the following pure functions (implementations must match the design exactly):
    - `groupMessages(messages: EnrichedMessage[], windowMs?: number): MessageGroup[]` — groups consecutive messages from the same sender within a 5-minute window
    - `resolveSenderName(senderId: string, senderMap: Map<string, string | null>): string` — returns `full_name` or `"Unknown Member"` if null/blank/missing
    - `isValidContent(content: string): boolean` — returns `true` if trimmed length > 0 and total length ≤ 4000
    - `truncateChannelName(name: string, maxLength?: number): string` — truncates at 25 chars and appends `"..."` if longer
    - `appendWithDedup(messages: EnrichedMessage[], incoming: EnrichedMessage): EnrichedMessage[]` — appends only if `incoming.id` is not already in the array
    - `getMessageAlignment(senderId: string, currentUserId: string): "left" | "right"` — returns `"right"` if equal, `"left"` otherwise
    - `applyHistoryFilter(messages: RawMessage[]): RawMessage[]` — sorts ascending by `created_at`, limits to 50
  - **Acceptance:** All functions are exported from `lib.ts`; TypeScript compiles without errors

- [x] 3. Write property-based tests for the lib module
  - Create `src/app/(dashboard)/dashboard/messages/__tests__/properties.test.ts`
  - Implement the following property tests using `fast-check`, each tagged with its property number:
    - **Property 5 — Message grouping invariant:** For any array of `EnrichedMessage` objects sorted ascending by `created_at`, `groupMessages` must produce groups where every message shares the group's `senderId`, consecutive messages within a group are ≤ 5 minutes apart, and no two adjacent groups have the same `senderId` with a gap ≤ 5 minutes
    - **Property 6 — Sender name resolution:** For any `senderId` and `senderMap`, `resolveSenderName` returns the map's value if it is non-null and non-blank, otherwise `"Unknown Member"`
    - **Property 7 — Whitespace content rejection:** For any string composed entirely of whitespace characters, `isValidContent` returns `false`
    - **Property 8 — Realtime deduplication:** For any message array and a duplicate of any existing message, `appendWithDedup` returns an array of the same length with exactly one occurrence of that id
    - **Property 10 — Message bubble alignment:** For any two UUIDs, `getMessageAlignment` returns `"right"` iff they are equal, `"left"` otherwise
    - **Property 11 — History limit and ordering:** For any array of `RawMessage` objects, `applyHistoryFilter` returns at most 50 messages ordered strictly ascending by `created_at`
    - **Property 12 — Project name truncation:** For any string longer than 25 characters, `truncateChannelName` returns a string ending with `"..."` whose non-ellipsis prefix equals the first 25 characters of the input
  - Each test must run a minimum of 100 iterations (`numRuns: 100`)
  - **Acceptance:** All 7 property tests pass

- [x] 4. Rebuild the `/api/messages/history` route
  - Completely replace `src/app/api/messages/history/route.ts` with the new implementation
  - Set `export const runtime = "nodejs"`
  - Implement the following server-side logic in order:
    1. Authenticate via `supabase.auth.getUser()` — return HTTP 401 if no session
    2. Validate `workspaceId` query parameter — return HTTP 400 if missing
    3. Verify workspace membership: `SELECT 1 FROM team_members WHERE user_id = auth_user.id AND workspace_id = workspaceId` — return HTTP 403 if no row found
    4. If `projectId` is provided, verify the project exists in the workspace: `SELECT 1 FROM projects WHERE id = projectId AND workspace_id = workspaceId` — return HTTP 403 if not found
    5. Query `messages` table with the correct filter:
       - General channel: `workspace_id = workspaceId AND project_id IS NULL AND receiver_id IS NULL`
       - Project channel: `workspace_id = workspaceId AND project_id = projectId`
    6. Order ascending by `created_at`, limit to 50
    7. Batch-fetch sender names from `team_members` for all unique `sender_id` values in the result
    8. Enrich each message with `sender: { user_id, full_name }` — use `"Unknown Member"` if not found or blank
    9. Return `{ success: true, messages: EnrichedMessage[] }` with HTTP 200
  - Remove all DM (`receiverId`) logic — DMs are out of scope
  - **Acceptance:** Route returns correct HTTP status codes for all error conditions; returns enriched messages for valid requests

- [x] 5. Rebuild the `/api/messages/send` route
  - Completely replace `src/app/api/messages/send/route.ts` with the new implementation
  - Set `export const runtime = "nodejs"`
  - Implement the following server-side logic in order:
    1. Authenticate via `supabase.auth.getUser()` — return HTTP 401 if no session
    2. Parse and validate request body:
       - `workspaceId`: required, non-empty string — return HTTP 400 if missing
       - `content`: required; after trim must be non-empty and ≤ 4000 characters — return HTTP 400 if invalid
       - `projectId`: optional
    3. Verify workspace membership — return HTTP 403 if not a member
    4. If `projectId` provided, verify the project exists in the workspace — return HTTP 403 if not found
    5. Insert message: `{ workspace_id, project_id: projectId ?? null, sender_id: user.id, receiver_id: null, content: content.trim() }`
    6. Fetch sender's `full_name` from `team_members`
    7. Return `{ success: true, message: EnrichedMessage }` with HTTP 200
  - Remove all DM (`receiverId`) logic
  - **Acceptance:** Route enforces all validation rules; inserts correct row shape; returns enriched message on success

- [x] 6. Build the `MessagesSidebar` component
  - Create `src/app/(dashboard)/dashboard/messages/components/MessagesSidebar.tsx`
  - Accept props: `MessagesSidebarProps` (from design)
  - Render two sections:
    - **"Workspace"** section: single `ChannelEntry` for the General channel (label `"General"`, type `"general"`, Globe icon)
    - **"Projects"** section: one `ChannelEntry` per project in `props.projects`
  - Create `ChannelEntry` sub-component (can be in the same file or a separate file):
    - Accepts `ChannelEntryProps`
    - Displays Hash icon for project channels, Globe icon for general
    - Truncates project names at 25 characters using `truncateChannelName` from `lib.ts`
    - Applies active highlight styles (indigo background, white text, heavier font) when `isActive` is true
    - Calls `onSelect(channel)` on click
  - **Acceptance:** Sidebar renders correct sections; active channel is visually highlighted; project names > 25 chars are truncated with ellipsis

- [x] 7. Build the `ChannelHeader` component
  - Create `src/app/(dashboard)/dashboard/messages/components/ChannelHeader.tsx`
  - Accept props: `ChannelHeaderProps` (from design)
  - Display channel name and type icon (Globe for general, Hash for project)
  - When `connectionError` is `true`, display a visible amber/red `ConnectionErrorBanner` inside the header area
  - When `connectionError` is `false`, the banner must not be rendered
  - **Acceptance:** Header always shows channel name and icon; connection error banner appears/disappears correctly

- [x] 8. Build the `MessageBubble` and `MessageGroup` components
  - Create `src/app/(dashboard)/dashboard/messages/components/MessageBubble.tsx`
    - Accept `MessageBubbleProps`
    - Use `getMessageAlignment` from `lib.ts` to determine alignment
    - Own messages: right-aligned (`flex-row-reverse`), indigo background (`bg-indigo-600 text-white`)
    - Other messages: left-aligned, white/slate background (`bg-white border border-slate-200 text-slate-700`)
    - Render message `content` (support multi-line via `whitespace-pre-wrap`)
  - Create `src/app/(dashboard)/dashboard/messages/components/MessageGroup.tsx`
    - Accept `MessageGroupProps`
    - Render a `GroupHeader` showing `senderName` and formatted timestamp (HH:MM) for the first message only
    - Render one `MessageBubble` per message in `group.messages`
    - Apply `isCurrentUser` styling to the group header (right-align for own messages)
  - **Acceptance:** Own messages are right-aligned indigo; others are left-aligned white; sender name header appears only once per group

- [x] 9. Build the `MessageFeed` component
  - Create `src/app/(dashboard)/dashboard/messages/components/MessageFeed.tsx`
  - Accept `MessageFeedProps` (from design), including `scrollRef`
  - Compute `MessageGroup[]` by calling `groupMessages` from `lib.ts` on `props.messages`
  - Render based on `feedState`:
    - `"loading"`: `LoadingState` — skeleton or spinner
    - `"error"`: `ErrorState` — error message + retry button that calls `onRetry`
    - `"access_denied"`: `AccessDeniedState` — "Access Denied" message
    - `"ready"` with empty messages: `EmptyState` — prompt text encouraging the user to start the conversation
    - `"ready"` with messages: render `MessageGroup` components
  - Attach `scrollRef` to the scrollable container div
  - **Acceptance:** Correct state component renders for each `feedState` value; groups are rendered in order; scroll ref is attached

- [x] 10. Build the `MessageComposer` component
  - Create `src/app/(dashboard)/dashboard/messages/components/MessageComposer.tsx`
  - Accept `MessageComposerProps` (from design)
  - Use a `<textarea>` element (not `<input>`) that auto-resizes up to a max height
  - Implement keyboard handling:
    - `Enter` (without Shift): call `isValidContent` from `lib.ts`; if valid and `sendState !== "sending"`, call `onSend(value)`; always `preventDefault()`
    - `Shift+Enter`: do not `preventDefault()` — allow default textarea newline insertion
  - Disable both the textarea and the Send button when `sendState === "sending"`
  - When `sendError` is non-null, display an inline error notification above the composer
  - Clear the textarea after `onSend` resolves successfully (the parent controls this via `sendState` transitioning back to `"idle"`)
  - **Acceptance:** Enter submits valid content; Shift+Enter inserts newline; textarea and button are disabled while sending; error notification appears when `sendError` is set

- [x] 11. Rebuild the `MessagesPage` component
  - Completely replace `src/app/(dashboard)/dashboard/messages/page.tsx`
  - Mark as `"use client"`
  - Declare all state variables per the design:
    - `user`, `workspaceId`, `projects`, `senderMap` (as `useRef<Map<string, string>>`), `activeChannel`, `messages`, `feedState`, `sendState`, `sendError`, `connectionError`
  - Implement `loadWorkspaceData()` on mount:
    1. `supabase.auth.getUser()` — redirect to `/login` if no user
    2. Query `team_members` for the user's workspace — build `senderMap` ref
    3. Query `projects` for the workspace — set `projectList`
  - Implement `switchChannel(channel: ActiveChannel)`:
    1. Unsubscribe from any existing realtime subscription
    2. Set `activeChannel`, clear `messages`, set `feedState = "loading"`
    3. Call `fetchHistory(channel)` — set `feedState = "ready"` on success, `"error"` on failure
    4. Call `subscribeRealtime(channel)`
    5. Scroll to bottom after history loads
  - Implement `fetchHistory(channel)` using `AbortController` with a 10-second timeout:
    - GET `/api/messages/history?workspaceId=...&projectId=...`
    - On 403: set `feedState = "access_denied"`
    - On other error or timeout: set `feedState = "error"`
  - Implement `subscribeRealtime(channel)` using a `useEffect` with `activeChannel` as dependency:
    - Channel key: `messages:workspace:${workspaceId}` for general, `messages:project:${projectId}` for project
    - Filter: `workspace_id=eq.${workspaceId}` for general, `project_id=eq.${projectId}` for project
    - On INSERT: deduplicate by id, filter by channel type, enrich with `senderMapRef.current`, append to messages, scroll to bottom
    - On status `"CHANNEL_ERROR"` or `"TIMED_OUT"`: set `connectionError = true`; on `"SUBSCRIBED"`: set `connectionError = false`
    - Cleanup: `supabase.removeChannel(sub)` on effect teardown
  - Implement `sendMessage(content: string)`:
    1. Set `sendState = "sending"`, clear `sendError`
    2. POST `/api/messages/send` with `{ workspaceId, projectId?, content }`
    3. On success: clear input (via callback to `MessageComposer`), set `sendState = "idle"`
    4. On error: set `sendState = "error"`, set `sendError` to error message
  - Render:
    - `MessagesSidebar` always visible
    - When `activeChannel` is null: `WelcomeState`
    - When `activeChannel` is set: `ChannelView` containing `ChannelHeader`, `MessageFeed`, `MessageComposer`
  - **Acceptance:** Full page renders without errors; channel switching works; realtime subscription lifecycle is correct; send flow works end-to-end

- [x] 12. Write example-based unit tests
  - Create `src/app/(dashboard)/dashboard/messages/__tests__/examples.test.ts`
  - Write unit tests (no rendering required) for the pure functions in `lib.ts`:
    - `groupMessages`: empty array returns `[]`; single message returns one group; two consecutive messages from same sender within 5 min are in one group; two messages from same sender > 5 min apart are in separate groups; messages from different senders are always in separate groups
    - `resolveSenderName`: returns `full_name` when present and non-blank; returns `"Unknown Member"` when key missing; returns `"Unknown Member"` when value is `null`; returns `"Unknown Member"` when value is empty string; returns `"Unknown Member"` when value is whitespace-only
    - `isValidContent`: returns `false` for empty string; returns `false` for whitespace-only; returns `true` for single character; returns `false` for string of length 4001; returns `true` for string of length 4000
    - `truncateChannelName`: returns unchanged string when ≤ 25 chars; returns 25-char prefix + `"..."` when > 25 chars; handles exactly 25 chars without truncation; handles exactly 26 chars with truncation
    - `appendWithDedup`: appends new message; does not append duplicate id; returns new array reference
    - `getMessageAlignment`: returns `"right"` for same id; returns `"left"` for different ids
    - `applyHistoryFilter`: returns empty array for empty input; returns all messages when ≤ 50; returns exactly 50 when > 50; result is sorted ascending by `created_at`
  - **Acceptance:** All example tests pass

- [x] 13. Add SQL migration file for RLS policies and indexes
  - Create `scratch/messaging_rls_migration.sql` with the complete SQL from the design:
    - Drop existing policies: `"Read workspace messages"`, `"Read direct messages"`, `"Send messages"`
    - Create four new policies: `select_general_channel_messages`, `select_project_channel_messages`, `insert_general_channel_messages`, `insert_project_channel_messages`
    - Create two performance indexes: `idx_messages_workspace_project_created`, `idx_messages_workspace_general`
  - Add a comment block at the top of the file explaining that this must be run in the Supabase SQL editor
  - **Acceptance:** SQL file is syntactically valid and matches the policy definitions in the design document exactly

---

## Notes

- **DMs are out of scope.** The existing page has DM support; the rebuild removes it entirely. The sidebar will not have a "Direct Messages" section.
- **fast-check must be installed** before task 3 can run. Task 1 handles this.
- **RLS migration (task 13)** must be applied in Supabase before the API routes will enforce project-level access control correctly. This is a manual step.
- **senderMap is a `useRef`**, not `useState`, so the realtime callback always reads the latest map without causing subscription churn.
- **`FeedState`** includes `"access_denied"` in addition to the four states listed in the design's type alias — the error handling section clarifies this.
- Tasks 2–3 (lib + property tests) should be completed before tasks 4–11 (API + UI) to ensure the pure functions are correct before they are used.
