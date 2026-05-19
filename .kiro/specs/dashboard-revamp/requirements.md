# Requirements Document

## Introduction

This feature is a complete revamp of the APO project management application's main dashboard (`/dashboard`). The current dashboard shows basic project stats, a bar chart, reminders, a project list, AI milestones, and a team performance section. The revamp replaces this with a best-in-class, data-dense command center that surfaces all available live data from the Supabase backend — including projects, sprints, tasks, team members, analytics, messages, risk signals, roadmap milestones, and AI insights — in a single, cohesive view. All data must be fetched live from Supabase with no mock or placeholder values. The dashboard must be fully interactive, responsive, and visually consistent with the existing dark-sidebar / light-content design language.

## Glossary

- **Dashboard**: The main page at `/dashboard` rendered by `page.tsx` and `DashboardClient.tsx`.
- **Workspace**: The top-level tenant entity; every user belongs to exactly one workspace.
- **Project**: A record in the `projects` table scoped to a workspace.
- **Sprint**: A time-boxed iteration in the `sprints` table linked to a project.
- **Sprint_Task**: A work item in the `sprint_tasks` table linked to a sprint and project.
- **Team_Member**: A record in the `team_members` table representing a person in the workspace.
- **AI_Milestone**: A milestone object stored in `projects.ai_data.milestones[]`.
- **Activity**: A record in the `team_activity` table capturing workspace events.
- **Message**: A record in the `messages` table for workspace or project-scoped chat.
- **Risk**: A computed signal derived from sprint burndown, team capacity, or milestone status.
- **KPI_Card**: A summary metric tile displayed prominently at the top of the dashboard.
- **Widget**: A self-contained dashboard panel that displays a specific data domain.
- **Supabase_Client**: The server-side Supabase client created via `createClient()` from `utils/supabase/server`.
- **Realtime_Subscription**: A Supabase Realtime channel subscription for live data updates.
- **Burndown_Gap**: The difference between the expected completion percentage (based on time elapsed in the sprint) and the actual completion percentage (based on tasks done), at the current point in the sprint.
- **Velocity**: The ratio of completed sprint tasks to total sprint tasks, expressed as a percentage.

---

## Requirements

### Requirement 1: Live KPI Summary Strip

**User Story:** As a project manager, I want to see a top-level summary of all key workspace metrics at a glance, so that I can immediately understand the health of my workspace without scrolling.

#### Acceptance Criteria

1. THE Dashboard SHALL display a horizontal strip of at least six KPI cards at the top of the page.
2. WHEN the Dashboard loads, THE Dashboard SHALL fetch the following counts from the backend: total projects, active projects, total sprints, active sprints, total sprint tasks, and completed sprint tasks.
3. IF total sprint tasks is greater than zero, THEN THE Dashboard SHALL derive a workspace-level task completion percentage rounded to the nearest whole number from `(completed sprint tasks / total sprint tasks) * 100` and display it as a KPI card.
4. IF total sprints is greater than zero, THEN THE Dashboard SHALL derive a workspace-level sprint velocity from `(completed sprints / total sprints) * 100` rounded to the nearest whole number and display it as a KPI card.
5. IF total sprints equals zero, THEN THE Dashboard SHALL display "—" in the sprint velocity KPI card rather than "0%" or "NaN".
6. IF total sprint tasks equals zero, THEN THE Dashboard SHALL display "—" in the task completion KPI card rather than "0%" or "NaN".
7. THE Dashboard SHALL display the count of team members with an online status as a "Team Online" KPI card.
8. IF the workspace has no projects, THEN THE Dashboard SHALL display zero values in all KPI cards without rendering errors.

---

### Requirement 2: Active Sprints Widget

**User Story:** As a project manager, I want to see all currently active sprints across all projects in one place, so that I can monitor in-flight work without navigating into each project.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL fetch all active sprints scoped to the workspace from the backend.
2. THE Dashboard SHALL display each active sprint as a card showing: sprint name, parent project name, start date, end date, task completion count (`done / total`), completion percentage, days remaining, and an assignee avatar stack (maximum 3 avatars, then a "+N" overflow indicator).
3. THE Dashboard SHALL compute days remaining as the ceiling of the number of days between now and the sprint end date, and display it with a color indicator: green for ≥ 7 days, amber for 3–6 days, red for ≤ 2 days.
4. THE Dashboard SHALL display a burndown health indicator per sprint: green when Burndown_Gap ≤ 10, amber when Burndown_Gap is 11–25, red when Burndown_Gap > 25.
5. WHEN no active sprints exist, THE Dashboard SHALL display an empty state message: "No active sprints — create one from a project."
6. WHEN an active sprint card is clicked, THE Dashboard SHALL navigate to the sprint detail page for that sprint within its parent project.
7. THE Active_Sprints_Widget SHALL display a maximum of four sprint cards; WHEN more than four active sprints exist, THE Active_Sprints_Widget SHALL show a "View all sprints" link that navigates to `/dashboard/projects`.
8. IF a sprint's end date is in the past, THEN THE Dashboard SHALL display days remaining as 0 with a red color indicator.

---

### Requirement 3: Task Pipeline Widget

**User Story:** As a project manager, I want to see a cross-project breakdown of tasks by status, so that I can identify bottlenecks and overdue work at a glance.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL fetch all sprint tasks scoped to the workspace from the backend and group them by status.
2. THE Task_Pipeline_Widget SHALL display four columns: "To Do" (`status = 'todo'`), "In Progress" (`status = 'in_progress'`), "In Review" (`status = 'review'`), and "Done" (`status = 'done'`).
3. IF total sprint tasks is greater than zero, THEN THE Task_Pipeline_Widget SHALL display the count and percentage of total tasks for each status column, where each percentage is rounded to the nearest whole number and the four percentages sum to exactly 100 (with any rounding remainder applied to the largest column).
4. IF total sprint tasks equals zero, THEN THE Task_Pipeline_Widget SHALL display only the count (zero) for each status column without a percentage.
5. IF total sprint tasks is greater than zero, THEN THE Task_Pipeline_Widget SHALL render a proportional horizontal bar showing the relative distribution of tasks across all four statuses; IF total sprint tasks equals zero, THEN THE Task_Pipeline_Widget SHALL render the bar as a single empty grey segment.
6. WHEN a status column header is clicked AND total sprint tasks is greater than zero, THE Task_Pipeline_Widget SHALL navigate to `/dashboard/projects` with a query parameter indicating the selected status filter; WHEN total sprint tasks equals zero, THE Task_Pipeline_Widget SHALL not navigate on click.
7. THE Task_Pipeline_Widget SHALL display the top three most recently updated tasks per status column, showing task title and sprint name.
8. WHEN a task item is clicked, THE Task_Pipeline_Widget SHALL navigate to the sprint detail page for that task's parent sprint.

---

### Requirement 4: Team Pulse Widget

**User Story:** As a project manager, I want to see the real-time status and workload of every team member, so that I can identify who is overloaded or available for new assignments.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL fetch all team members in the workspace from the backend.
2. THE Team_Pulse_Widget SHALL display each team member as a row showing: avatar (when an avatar URL is available) or initials (when no avatar URL is available), name, job title, online status indicator, current active task count, capacity utilization, and performance score.
3. IF a team member's capacity hours per week is greater than zero, THEN THE Dashboard SHALL compute capacity utilization as the ratio of the sum of `time_estimate_hours` for that member's non-done sprint tasks to their capacity hours per week, expressed as a percentage rounded to the nearest whole number.
4. IF a team member's capacity hours per week is zero or negative, THEN THE Team_Pulse_Widget SHALL display "N/A" for that member's utilization.
5. THE Team_Pulse_Widget SHALL apply a color-coded utilization badge: green for ≤ 70%, amber for 71–100%, red for > 100%, and grey for "N/A".
6. WHEN a team member row is clicked, THE Team_Pulse_Widget SHALL navigate to `/dashboard/team`.
7. IF the workspace has more than eight team members, THEN THE Team_Pulse_Widget SHALL display the first eight members sorted alphabetically by name and show a "View full team" link.
8. IF the workspace has eight or fewer team members, THEN THE Team_Pulse_Widget SHALL not display the "View full team" link.
9. IF a team member has a performance score set, THEN THE Team_Pulse_Widget SHALL render a mini progress bar representing the score out of 100.
10. IF a team member has no performance score set, THEN THE Team_Pulse_Widget SHALL display "—" in place of the performance score and omit the progress bar.

---

### Requirement 5: Risk Radar Summary Widget

**User Story:** As a project manager, I want to see a consolidated list of the highest-priority risks across all projects, so that I can take action without visiting each project's risk page individually.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL compute risks across all active projects in the workspace using the following four categories and severity thresholds:
   - **Burndown risk**: critical when Burndown_Gap > 40, high when Burndown_Gap is 26–40, medium when Burndown_Gap is 11–25.
   - **Capacity risk**: critical when any team member's utilization exceeds 120%, high when utilization is 101–120%, medium when utilization is 81–100%.
   - **Milestone risk**: critical when a milestone with `status = 'blocked'` exists, high when a milestone is overdue (computed deadline has passed and status is not 'completed'), medium when a milestone is due within 7 days and status is not 'completed'.
   - **Velocity risk**: high when sprint velocity falls below 50%, medium when velocity is 50–69%.
2. THE Risk_Radar_Widget SHALL display up to five risks sorted by severity: critical first, then high, then medium; within the same severity tier, risks SHALL be sorted by project name ascending as a tiebreaker.
3. EACH risk item SHALL display: severity badge (critical / high / medium), risk category, risk title, and the parent project name.
4. THE Risk_Radar_Widget SHALL display a summary count of critical, high, and medium risks at the top of the widget.
5. WHEN no risks are detected across any active project, THE Risk_Radar_Widget SHALL display a green "All Clear" state with the message "No active risks detected across your workspace."
6. WHEN a risk item is clicked, THE Risk_Radar_Widget SHALL navigate to `/dashboard/projects/{project_id}/risk-radar`.

---

### Requirement 6: AI Milestones Timeline Widget

**User Story:** As a project manager, I want to see upcoming AI-generated milestones across all projects in a timeline view, so that I can plan ahead and ensure milestones are on track.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL extract AI-generated milestones from all active projects and flatten them into a single list sorted by `week_number` ascending.
2. THE AI_Milestones_Widget SHALL display each milestone as a row showing: week badge (e.g., "W3"), milestone title, parent project name, status badge, and an assignee avatar stack (maximum 3 avatars, then a "+N" overflow indicator).
3. IF a milestone has `status = 'completed'`, THEN THE AI_Milestones_Widget SHALL render it with line-through text decoration and 50% opacity.
4. IF a milestone has `status = 'blocked'`, THEN THE AI_Milestones_Widget SHALL render it with a red left border and a "Blocked" badge.
5. IF a milestone has `status = 'pending'` or `status = 'in_progress'`, THEN THE AI_Milestones_Widget SHALL render it with default styling and no special badge.
6. THE AI_Milestones_Widget SHALL display a maximum of eight milestones; WHEN more than eight milestones exist, THE AI_Milestones_Widget SHALL show a "View all milestones" link.
7. WHEN a milestone row is clicked, THE AI_Milestones_Widget SHALL navigate to `/dashboard/projects/{project_id}/roadmap`.
8. WHEN no milestones exist across any active project, THE AI_Milestones_Widget SHALL display an empty state: "No milestones yet — run the AI planner on a project."
9. IF a project's `ai_data` is null or its `milestones` array is absent, THEN THE Dashboard SHALL treat that project as contributing zero milestones and continue rendering milestones from other projects without error.

---

### Requirement 7: Recent Messages Preview Widget

**User Story:** As a team member, I want to see a preview of the most recent messages from all channels, so that I can stay informed about team communication without leaving the dashboard.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL fetch the ten most recent messages scoped to the workspace from the backend, ordered by creation time descending.
2. THE Messages_Preview_Widget SHALL display each message showing: sender name, message content truncated to 80 characters with an ellipsis when truncated, channel name (General or project name), and a relative timestamp formatted as: "Xs ago" for < 60 seconds, "Xm ago" for < 60 minutes, "Xh ago" for < 24 hours, and "MMM D" for ≥ 24 hours.
3. THE Messages_Preview_Widget SHALL display a "General" label for messages with no associated project and the project name for project-scoped messages.
4. WHEN a message item is clicked, THE Messages_Preview_Widget SHALL navigate to `/dashboard/messages`.
5. IF a message was sent after the user's last recorded visit to the messages page, THEN THE Messages_Preview_Widget SHALL display an unread indicator dot on that message; IF the user has never visited the messages page, THEN all messages SHALL be treated as unread.
6. WHEN no messages exist, THE Messages_Preview_Widget SHALL display only the empty state message "No messages yet — start a conversation." with no other UI elements.
7. WHEN messages exist, THE Messages_Preview_Widget SHALL display a "Go to Messages" button that navigates to `/dashboard/messages`.
8. IF the messages query fails, THEN THE Messages_Preview_Widget SHALL display an inline error message "Could not load messages." without crashing the rest of the dashboard.

---

### Requirement 8: Project Health Overview Widget

**User Story:** As a project manager, I want to see the health status of all projects in a compact grid, so that I can quickly identify which projects need attention.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL fetch all projects in the workspace from the backend including their name, status, creation date, AI data, and budget estimate.
2. THE Project_Health_Widget SHALL display each project as a compact card showing: project name, status badge, sprint count, task completion percentage, budget utilization (only when budget estimate is greater than zero), and a health color indicator.
3. THE Dashboard SHALL compute project health color using the following rules in priority order: IF the project has any critical risks, THEN health is red; ELSE IF the project has any high risks OR task completion is below 40%, THEN health is amber; ELSE IF task completion is 40–69%, THEN health is amber; ELSE health is green.
4. THE Project_Health_Widget SHALL display a maximum of six project cards in a responsive grid; WHEN more than six projects exist, THE Project_Health_Widget SHALL show a "View all projects" link that navigates to `/dashboard/projects`.
5. WHEN a project card is clicked, THE Project_Health_Widget SHALL navigate to `/dashboard/projects/{project_id}`.
6. IF a project has `status = 'completed'`, THEN THE Project_Health_Widget SHALL render it with 50% opacity and a "Completed" badge.
7. THE Project_Health_Widget SHALL display a "New Project" button that navigates to `/dashboard/projects/new`.

---

### Requirement 9: Activity Feed Widget

**User Story:** As a project manager, I want to see a live feed of recent workspace activity, so that I can stay informed about what the team has been doing.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL fetch the twenty most recent activity records scoped to the workspace from the backend, ordered by creation time descending.
2. THE Activity_Feed_Widget SHALL display each activity item showing: activity description, activity type icon, relative timestamp (formatted as "X minutes/hours ago" for events within 24 hours, and "MMM D, YYYY" for events older than 24 hours), and the team member's name IF a team member is associated with the activity.
3. IF a team member is not associated with an activity record, THEN THE Activity_Feed_Widget SHALL display the activity without a member name.
4. IF activities from the same calendar day are consecutive in the list, THEN THE Activity_Feed_Widget SHALL group them under a date separator labeled "Today", "Yesterday", or "MMM D, YYYY" for older dates.
5. THE Activity_Feed_Widget SHALL display a maximum of ten activity items.
6. IF the workspace has more than ten activity records, THEN THE Activity_Feed_Widget SHALL show a "View all activity" link.
7. WHEN no activity exists, THE Activity_Feed_Widget SHALL display an empty state: "No recent activity in this workspace."
8. THE Activity_Feed_Widget SHALL display activity type icons: a checkmark for task completions, a lightning bolt for sprint events, a user icon for team events, and a folder icon for project events.
9. IF an activity type does not match any of the four known categories, THEN THE Activity_Feed_Widget SHALL display a generic info icon.

---

### Requirement 10: Next Deadline Countdown Widget

**User Story:** As a project manager, I want to see a countdown to the next critical deadline, so that I can keep the team focused on the most time-sensitive deliverable.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Dashboard SHALL identify the nearest upcoming end date among all active sprints in the workspace whose end date is in the future.
2. THE Countdown_Widget SHALL display the sprint name, parent project name, end date, and a live countdown showing days, hours, and minutes remaining.
3. THE Countdown_Widget SHALL update the countdown display every 60 seconds; each tick SHALL also re-evaluate which sprint or milestone has the nearest upcoming deadline.
4. IF no active sprints have a future end date, THEN THE Countdown_Widget SHALL display the nearest upcoming AI-generated milestone deadline instead.
5. WHEN no deadlines exist at all (no active sprints with future end dates and no AI milestones), THE Countdown_Widget SHALL display "No upcoming deadlines."
6. IF the nearest deadline is within 48 hours, THEN THE Countdown_Widget SHALL display an urgency indicator styled in red; IF the nearest deadline is within 7 days but more than 48 hours away, THEN THE Countdown_Widget SHALL display an urgency indicator styled in amber; IF the nearest deadline is more than 7 days away, THEN THE Countdown_Widget SHALL display an urgency indicator styled in green.

---

### Requirement 11: Dashboard Layout and Responsiveness

**User Story:** As a user on any device, I want the dashboard to be fully usable on both desktop and mobile screens, so that I can manage my projects from any device.

#### Acceptance Criteria

1. THE Dashboard SHALL use a CSS grid layout with a minimum of two columns on screens ≥ 768px wide and a single column on screens < 768px wide.
2. THE Dashboard SHALL render all widgets without horizontal overflow on screens as narrow as 375px; no widget element SHALL exceed the viewport width.
3. THE Dashboard SHALL maintain the existing dark sidebar (`bg-[#0F172A]`) and light content area (`bg-[#F0F2F8]`) design language.
4. THE Dashboard SHALL use the existing color palette: violet/indigo for primary action buttons and links, emerald for success states, amber for warning states, red for error states.
5. THE Dashboard SHALL apply `animate-in fade-in duration-500` to the element wrapping all widgets for a smooth load transition.
6. WHEN the Dashboard is loading data, THE Dashboard SHALL display unanimated grey skeleton placeholder blocks matching the approximate dimensions of each widget in place of the actual widget content, and no widget element SHALL exceed the viewport width during the loading state.
7. THE Dashboard SHALL be keyboard-navigable: all interactive elements SHALL be reachable via Tab key, activatable via Enter or Space, and SHALL display a visible 2px focus outline when focused.

---

### Requirement 12: Live Data Freshness

**User Story:** As a project manager, I want the dashboard data to reflect the current state of the workspace, so that I am never making decisions based on stale information.

#### Acceptance Criteria

1. THE Dashboard page SHALL fetch all data from the backend on every page load without serving cached responses.
2. THE Dashboard SHALL render all fetched data in a client-side component that receives the data as props from the server-side page.
3. WHEN the user clicks the Refresh button, THE Dashboard SHALL re-fetch all server-side data and update the displayed content.
4. WHEN the user clicks the Refresh button, THE Dashboard SHALL display a loading spinner on the button; IF the refresh has not completed within 30 seconds, THEN THE Dashboard SHALL stop the spinner and display an error message.
5. THE Dashboard SHALL display a "Last updated" timestamp in the page header; IF the data was fetched within the last 60 seconds, THEN the timestamp SHALL read "Just now"; IF the data was fetched more than 60 seconds ago, THEN the timestamp SHALL read "X minutes ago" where X is the number of whole minutes elapsed.
6. IF a backend query for a specific widget returns an error, THEN THE Dashboard SHALL display an inline error banner within that widget's area while continuing to display all other widgets that loaded successfully.
7. THE Dashboard SHALL never crash the entire page due to a backend query failure, even when all queries fail simultaneously.
8. IF a backend query returns an error, THEN THE Dashboard SHALL log the error details to the browser console for debugging.

---

### Requirement 13: Dashboard Header and Navigation

**User Story:** As a user, I want the dashboard header to provide quick access to key actions and show contextual workspace information, so that I can navigate efficiently.

#### Acceptance Criteria

1. THE Dashboard header SHALL display the current workspace name fetched from the backend.
2. IF the workspace name cannot be fetched, THEN THE Dashboard header SHALL display "My Workspace" as a fallback.
3. THE Dashboard header SHALL display a "New Project" button that navigates to `/dashboard/projects/new`.
4. THE Dashboard header SHALL display a "Refresh" button as described in Requirement 12.
5. WHEN the Dashboard loads and the current user's name is available, THE Dashboard header SHALL display a greeting formatted as "Good [morning/afternoon/evening], [name]" where morning is hours 0–11, afternoon is hours 12–16, and evening is hours 17–23.
6. IF the current user's name is not available, THEN THE Dashboard header SHALL display "Good [morning/afternoon/evening]" without a name.
7. THE Dashboard header SHALL display the current date formatted as "Monday, January 1, 2025".

---

## Correctness Properties

### Property 1: Task Status Percentages Sum to 100

**Criterion:** Requirement 3 — Task Pipeline Widget status percentages

**Type:** Invariant

**Description:** For any non-empty set of sprint tasks, the sum of the percentage values across all four status columns (todo, in_progress, review, done) must equal exactly 100. This ensures the proportional bar and percentage labels are always consistent.

**Formal statement:** `FOR ALL task_sets WHERE len(task_set) > 0: sum(pct_todo, pct_in_progress, pct_review, pct_done) == 100`

---

### Property 2: Risk List is Sorted by Severity

**Criterion:** Requirement 5 — Risk Radar Summary Widget sorting

**Type:** Invariant

**Description:** For any computed list of risks, the output must always be sorted with critical risks first, high risks second, and medium risks last. No risk of lower severity may appear before a risk of higher severity.

**Formal statement:** `FOR ALL risk_lists: risk_list[i].severity_order <= risk_list[i+1].severity_order` where critical=0, high=1, medium=2.

---

### Property 3: AI Milestones are Sorted Ascending by Week Number

**Criterion:** Requirement 6 — AI Milestones Timeline Widget ordering

**Type:** Invariant

**Description:** For any set of milestones flattened from multiple projects, the resulting list must always be sorted in ascending order by `week_number`. No milestone with a higher week number may appear before one with a lower week number.

**Formal statement:** `FOR ALL milestone_lists: milestone_list[i].week_number <= milestone_list[i+1].week_number`

---

### Property 4: Message Content Truncation Never Exceeds 80 Characters

**Criterion:** Requirement 7 — Recent Messages Preview Widget content truncation

**Type:** Invariant

**Description:** For any message content string of any length, the truncated display value must always be 80 characters or fewer. This ensures the widget layout is never broken by long messages.

**Formal statement:** `FOR ALL content_strings: len(truncate(content)) <= 80`

---

### Property 5: Greeting Function Always Returns a Valid Greeting

**Criterion:** Requirement 13 — Dashboard Header greeting logic

**Type:** Invariant

**Description:** For any integer hour value in the range 0–23, the greeting function must always return exactly one of "Good morning", "Good afternoon", or "Good evening". No other string is valid.

**Formal statement:** `FOR ALL hours IN [0..23]: getGreeting(hour) IN {"Good morning", "Good afternoon", "Good evening"}`

---

### Property 6: Nearest Deadline is Always the Minimum Future Date

**Criterion:** Requirement 10 — Next Deadline Countdown Widget deadline selection

**Type:** Invariant

**Description:** For any set of candidate deadline dates (sprint end dates and AI milestone dates), the selected deadline must always be the minimum date that is strictly greater than the current time. No future date that is earlier than the selected date may exist in the candidate set.

**Formal statement:** `FOR ALL candidate_sets WHERE len(future_candidates) > 0: selected_deadline == min(future_candidates)`
