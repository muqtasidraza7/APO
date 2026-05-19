# Requirements Document

## Introduction

This feature rebuilds the existing broken messaging section of the APO project management platform from scratch, replacing it with a polished, Slack-inspired real-time messaging experience. The system provides two types of channels: a **General** channel where every workspace member is automatically present, and **Project Channels** scoped to the members of each individual project. Messages are delivered instantly via Supabase Realtime subscriptions — no page refresh required. Every message displays the sender's full name (first and last) sourced from the `team_members` table.

The existing `/dashboard/messages` page and its supporting API routes (`/api/messages/history`, `/api/messages/send`) are to be rebuilt from scratch. The underlying `messages` table schema in Supabase is retained and extended as needed.

## Glossary

- **Messaging_System**: The complete real-time messaging feature described in this document.
- **Workspace**: The top-level organizational unit in APO. Each user belongs to one or more workspaces via the `team_members` table.
- **General_Channel**: A single, workspace-scoped channel where all `team_members` of a workspace can read and send messages. Identified by `project_id IS NULL` and `receiver_id IS NULL` in the `messages` table.
- **Project_Channel**: A channel scoped to a specific project. Only users who are members of that project (present in `team_members` for the same `workspace_id` and associated with the project) can read or send messages. Identified by a non-null `project_id` in the `messages` table.
- **Channel**: Either a General_Channel or a Project_Channel.
- **Message**: A text record stored in the `messages` table with fields: `id`, `workspace_id`, `project_id` (nullable), `sender_id`, `content`, `created_at`.
- **Sender**: The authenticated user who authored a Message.
- **Sender_Name**: The `full_name` field from the `team_members` row matching the Message's `sender_id` and `workspace_id`. Falls back to "Unknown Member" if not found or blank.
- **Realtime_Subscription**: A Supabase channel subscription using `postgres_changes` that pushes new Message rows to connected clients without requiring a page reload.
- **Message_Feed**: The scrollable list of Messages rendered in the active Channel view, ordered ascending by `created_at`.
- **Channel_Sidebar**: The left-hand navigation panel listing the General_Channel and all Project_Channels the current user has access to.
- **Message_Input**: The text input area at the bottom of the chat view used to compose and submit new Messages.
- **RLS**: Row-Level Security policies on the `messages` table in Supabase that enforce access control at the database level.
- **Message_Group**: An uninterrupted sequence of consecutive Messages in the Message_Feed that share the same `sender_id`, ordered by `created_at`, where no Message from a different sender appears between them.

---

## Requirements

### Requirement 1: General Channel

**User Story:** As a workspace member, I want a General channel where all team members are present, so that I can communicate with the entire team in one place.

#### Acceptance Criteria

1. IF a user is an authenticated member of the workspace, THEN THE Channel_Sidebar SHALL display the General_Channel entry for that user.
2. WHEN a user selects the General_Channel, THE Messaging_System SHALL load and display all Messages where `project_id IS NULL` and `receiver_id IS NULL` for the current `workspace_id`.
3. WHEN a user sends a Message in the General_Channel, THE Messaging_System SHALL insert the Message into the `messages` table with `project_id = NULL`, `receiver_id = NULL`, and `sender_id` set to the authenticated user's ID.
4. THE RLS policy on the `messages` table SHALL enforce that any authenticated user whose `auth.uid()` matches a `team_members.user_id` row for the current `workspace_id` may SELECT and INSERT Messages in the General_Channel without any additional UI restriction.

---

### Requirement 2: Project Channels

**User Story:** As a project member, I want a dedicated channel for each project I belong to, so that project-specific discussions stay focused and private to the project team.

#### Acceptance Criteria

1. THE Channel_Sidebar SHALL display one Project_Channel entry per project that the current user is a member of, identified by the project's name.
2. WHEN a user selects a Project_Channel, THE Messaging_System SHALL load and display all Messages where `project_id` equals the selected project's `id` and `workspace_id` equals the current workspace.
3. WHEN a user sends a Message in a Project_Channel, THE Messaging_System SHALL insert the Message with `project_id` set to the selected project's `id`, `workspace_id` set to the current workspace, and `sender_id` set to the authenticated user's ID.
4. IF an authenticated user attempts to access a Project_Channel for a project they are not a member of (e.g., via direct URL or API call), THEN THE Messaging_System SHALL display an explicit "Access Denied" state in the Message_Feed area.
5. IF a user is not a member of a project, THEN THE Messaging_System SHALL not display that project's channel entry in the Channel_Sidebar.

---

### Requirement 3: Real-Time Message Delivery

**User Story:** As a channel participant, I want new messages to appear instantly in my view, so that conversations feel live and I never need to refresh the page.

#### Acceptance Criteria

1. WHEN a Message is inserted into the `messages` table for the active Channel, THE Messaging_System SHALL append the new Message to the Message_Feed within 2 seconds without a page reload.
2. WHILE a Channel is active, THE Messaging_System SHALL maintain a Realtime_Subscription that listens for `INSERT` events on the `messages` table filtered by the current `workspace_id` and, for a Project_Channel, also filtered by the active `project_id`; for the General_Channel, filtered to rows where `project_id IS NULL`.
3. WHEN the active Channel changes, THE Messaging_System SHALL unsubscribe from the previous Realtime_Subscription and establish a new one for the newly selected Channel.
4. WHEN a Realtime_Subscription receives a new Message event, THE Messaging_System SHALL enrich the incoming Message with the Sender_Name (falling back to "Unknown Member" if not found) before appending it to the Message_Feed.
5. WHILE a Realtime_Subscription is active, THE Messaging_System SHALL append each new incoming Message directly to the existing Message_Feed state without performing a full history re-fetch.
6. IF the Realtime_Subscription fails to connect or is unexpectedly disconnected, THEN THE Messaging_System SHALL display a visible connection-error indicator in the channel header area.
7. IF a Message received via Realtime_Subscription has an `id` already present in the Message_Feed, THEN THE Messaging_System SHALL discard the duplicate and not append it to the Message_Feed.

---

### Requirement 4: Sender Identity Display

**User Story:** As a message reader, I want to see the full name of the person who sent each message, so that I can identify who said what without ambiguity.

#### Acceptance Criteria

1. THE Messaging_System SHALL display the Sender_Name in a header row above the message content for the first Message of each Message_Group in the Message_Feed.
2. THE Messaging_System SHALL resolve the Sender_Name as defined in the Glossary (the `full_name` from `team_members` matched by `user_id` and `workspace_id`).
3. IF a sender's `full_name` is not found in `team_members`, or the `full_name` value is null or blank, THEN THE Messaging_System SHALL display "Unknown Member" as the Sender_Name.
4. WHEN consecutive Messages in the Message_Feed form a Message_Group (same `sender_id`, uninterrupted sequence ordered by `created_at`), THE Messaging_System SHALL display the Sender_Name header only on the first Message of the group and omit it from all subsequent Messages in the group.

---

### Requirement 5: Message Persistence and History

**User Story:** As a user returning to a channel, I want to see the message history, so that I can catch up on conversations I missed.

#### Acceptance Criteria

1. WHEN a user opens a Channel, THE Messaging_System SHALL fetch and display up to 50 of the most recent Messages for that Channel, ordered ascending by `created_at`.
2. THE Messaging_System SHALL retrieve Message history via the `/api/messages/history` endpoint, passing `workspaceId` and optionally `projectId` as query parameters.
3. WHILE Message history is loading, THE Messaging_System SHALL display a loading skeleton or spinner in the Message_Feed area; if loading has not completed within 10 seconds, THE Messaging_System SHALL transition to an error state.
4. WHEN Message history has loaded, THE Messaging_System SHALL automatically scroll the Message_Feed to the most recent Message.
5. WHEN a new Message is appended to the Message_Feed via Realtime_Subscription, THE Messaging_System SHALL scroll the Message_Feed to the bottom regardless of the user's current scroll position.
6. IF the `/api/messages/history` request returns an error or times out, THEN THE Messaging_System SHALL display an error state in the Message_Feed area with a retry control.

---

### Requirement 6: Message Composition and Sending

**User Story:** As a channel member, I want to type and send messages quickly, so that I can participate in conversations without friction.

#### Acceptance Criteria

1. THE Messaging_System SHALL render a Message_Input at the bottom of every active Channel view.
2. WHEN a user submits a Message via the Message_Input (by pressing Enter or clicking the Send button) and the `content` is non-empty, not solely whitespace, and does not exceed 4000 characters, THE Messaging_System SHALL POST the Message to `/api/messages/send` with `workspaceId`, `content`, and optionally `projectId`.
3. WHEN a Message is successfully sent, THE Messaging_System SHALL clear the Message_Input field within 300 milliseconds of receiving the success response.
4. WHILE a Message is being sent, THE Messaging_System SHALL disable the Send button and Message_Input to prevent duplicate submissions.
5. IF the send request fails, THEN THE Messaging_System SHALL re-enable the Message_Input, preserve the composed text, and display an inline error notification that persists until the user modifies the input or successfully sends a message.
6. IF a user attempts to submit a Message whose `content` consists entirely of whitespace characters, THEN THE Messaging_System SHALL not submit the message and SHALL not clear the Message_Input.
7. WHEN a user presses Shift+Enter in the Message_Input, THE Messaging_System SHALL insert a newline character at the cursor position without submitting the message.

---

### Requirement 7: Channel Navigation and Sidebar

**User Story:** As a user, I want a clear sidebar showing all my available channels, so that I can switch between conversations quickly.

#### Acceptance Criteria

1. THE Channel_Sidebar SHALL group channels into two sections: "Workspace" (containing the General_Channel) and "Projects" (containing all Project_Channels the user has access to).
2. WHEN a user clicks a channel entry in the Channel_Sidebar, THE Messaging_System SHALL set that channel as the active Channel and load up to 50 of its most recent Messages in reverse chronological order.
3. WHEN a channel becomes active, THE Messaging_System SHALL apply a distinguishable background color and heavier font weight to that channel's entry in the Channel_Sidebar.
4. WHEN no channel has been selected in the current session, THE Messaging_System SHALL display a welcome/empty state in the main content area with no Channel_Sidebar entry highlighted.
5. IF a channel is selected and its Message history fails to load, THEN THE Messaging_System SHALL display an error state in the Message_Feed area containing an error message and a retry control.
6. IF a Project_Channel entry's project name exceeds 25 characters, THEN THE Channel_Sidebar SHALL truncate the name at 25 characters and append an ellipsis indicator.

---

### Requirement 8: Access Control and Security

**User Story:** As a workspace administrator, I want channel access to be enforced at the database level, so that users cannot read messages from projects they are not part of.

#### Acceptance Criteria

1. THE RLS policy on the `messages` table SHALL allow a user to SELECT a Message only if the user is authenticated, the user's `auth.uid()` matches a `team_members.user_id` row with the same `workspace_id` as the Message, and — for Project_Channel messages — the user is also a member of the project identified by `project_id`.
2. THE RLS policy on the `messages` table SHALL allow a user to INSERT a Message only if the user is authenticated, `sender_id = auth.uid()`, and — for Project_Channel messages — the user is a member of the project identified by `project_id`.
3. IF the authenticated user is not a member of the workspace associated with the requested messages, THEN THE `/api/messages/history` endpoint SHALL reject the request with HTTP 403.
4. IF a request to `/api/messages/send` is unauthenticated or the authenticated user is not a member of the target channel's workspace or project, THEN THE endpoint SHALL reject the request with HTTP 401 or HTTP 403 respectively.
5. IF a Project_Channel message is requested for a project the user is not a member of, THEN THE `/api/messages/history` endpoint SHALL reject the request with HTTP 403.

---

### Requirement 9: Polished UI and User Experience

**User Story:** As a user, I want the messaging interface to feel modern and Slack-inspired, so that it is intuitive and pleasant to use.

#### Acceptance Criteria

1. THE Messaging_System SHALL render the full messaging interface within the existing dashboard layout, occupying the full available height minus the top navigation bar.
2. THE Messaging_System SHALL visually distinguish messages sent by the current user from messages sent by others using both different bubble alignment and a different background color.
3. THE Messaging_System SHALL display a timestamp (hours and minutes) alongside the Sender_Name header for each Message_Group, where a Message_Group is defined as consecutive messages from the same sender within a 5-minute window.
4. WHILE a Channel is active, THE Messaging_System SHALL display the channel header (name and type icon) at all times, including during Message history loading and when the Message_Feed is empty.
5. WHEN the Message_Feed contains no Messages, THE Messaging_System SHALL display a non-interactive visual element and prompt text encouraging the user to start the conversation.
6. WHEN a user presses the Enter key in the Message_Input (without Shift), THE Messaging_System SHALL submit the composed message.
7. IF the Message_Input is empty or contains only whitespace when the user presses Enter, THEN THE Messaging_System SHALL not submit and SHALL not clear the input.
8. WHEN a user presses Shift+Enter in the Message_Input, THE Messaging_System SHALL insert a newline at the cursor position without submitting the message.
