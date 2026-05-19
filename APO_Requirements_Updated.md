# Assistant Project Officer (APO) — Requirements Elicitation

## Functional Requirements

---

### FR01 — User Management & Authentication

| Requirement ID | Description |
|---|---|
| FR01-01 | The system shall allow users to register using email and password. |
| FR01-02 | The system shall support OAuth login using Google and GitHub accounts. |
| FR01-03 | The system shall allow users to reset forgotten passwords via an email link. |
| FR01-04 | The system shall restrict access to dashboard routes and redirect unauthenticated users to the /login page. |
| FR01-05 | The system shall maintain user session state using server-side Supabase cookies through middleware. |

---

### FR02 — Workspace & Onboarding

| Requirement ID | Description |
|---|---|
| FR02-01 | A new user shall be redirected to /onboarding if they do not belong to any workspace. |
| FR02-02 | A user may create a new workspace and become the workspace owner. |
| FR02-03 | A user may join an existing workspace via an invite link containing the workspace_id and an optional role parameter (pm or member). |
| FR02-04 | During onboarding, the user shall provide job title, skills, experience level, years of experience, and weekly capacity hours. |
| FR02-05 | Skills may be extracted automatically by uploading a CV (PDF, max 10 MB) which is parsed by the AI. |
| FR02-06 | Each user shall belong to exactly one workspace (single tenant per user). |
| FR02-07 | The onboarding flow shall support a two-step wizard: Step 1 — workspace setup; Step 2 — CV upload and profile completion. |
| FR02-08 | Users joining via an invite link with role=pm shall be assigned the Project Manager role automatically. |


---

### FR03 — Project Management

| Requirement ID | Description |
|---|---|
| FR03-01 | Authenticated owners and PMs shall be able to create a new project by uploading a PDF document (Project Charter or RFP). |
| FR03-02 | The system shall upload the PDF to Supabase Storage and record the project with ai_status = "parsing". |
| FR03-03 | The AI shall automatically process the document and extract project summary, budget estimate, currency, timeline (weeks), start/end dates, milestones, required skills, risks (with severity and mitigation), project type, client information, success criteria KPIs, requirements, constraints, and assumptions. |
| FR03-04 | After successful AI analysis, ai_status shall be updated to "completed". |
| FR03-05 | If AI analysis fails, ai_status shall be set to "failed" and the user shall be shown an error. |
| FR03-06 | Users shall be able to view all projects within their workspace. |
| FR03-07 | Users shall be able to soft-delete a project with a confirmation prompt; deleted projects shall be hidden from the main list. |
| FR03-08 | The project detail page shall display summary, budget, timeline, milestones (editable), required skills, and risk assessment with severity indicators. |
| FR03-09 | Milestones shall be individually updatable including title, deliverable, week, success criteria, and status. |
| FR03-10 | Owners and PMs shall be able to edit the full project blueprint (name, summary, budget, dates, milestones, risks, skills, requirements, constraints, assumptions, client info, KPIs) via the Project Blueprint Editor drawer. |
| FR03-11 | The system shall generate a shareable read-only project link (token-based) that PMs and owners can create, list, and deactivate. Share links may have an optional expiry date. |
| FR03-12 | A public share page (/share/[token]) shall display project milestones and summary to unauthenticated viewers when the token is valid and active. |
| FR03-13 | The project detail page shall display a Project Health Widget showing overall milestone completion percentage and health status. |
| FR03-14 | The system shall support a Global Search feature allowing users to search across projects, team members, and tasks within their workspace. |


---

### FR04 — Team Management

| Requirement ID | Description |
|---|---|
| FR04-01 | Workspace owners and PMs shall be able to add team members manually with details including name, email, job title, skills, capacity hours per week, and hourly rate. |
| FR04-02 | Team members may be invited via a shareable link that pre-fills the workspace ID and role on the onboarding page. |
| FR04-03 | The Team Dashboard shall display all members with workload, utilization percentage, active tasks, completed tasks, and performance score. |
| FR04-04 | Members shall be filterable by status: All, Online, Overloaded (>=90% utilization), and Available (<50% utilization). |
| FR04-05 | Owners and PMs shall be able to remove a team member by confirming the action by typing the member's full name. |
| FR04-06 | Upon removal of a team member, their assigned tasks shall be marked as unassigned. |
| FR04-07 | A Capacity Gauge shall display workspace-wide utilization metrics including total members, tasks, available hours, and workload distribution (overloaded, balanced, underutilized). |
| FR04-08 | Owners and PMs shall be able to edit a team member's profile including name, job title, skills, experience level, years of experience, capacity, and hourly rate via an Edit Member modal. |
| FR04-09 | Owners shall be able to change a workspace member's role (owner, pm, member, client) via a Change Role modal. |
| FR04-10 | The system shall display role badges (Owner, Project Manager, Team Member, Client) on team member cards with distinct colour coding. |
| FR04-11 | Team member edit history shall be recorded and viewable by owners and PMs. |


---

### FR05 — AI-Powered Resource Allocation

| Requirement ID | Description |
|---|---|
| FR05-01 | For a project with completed AI analysis, the AI Staffer shall match project milestones to team members. |
| FR05-02 | The AI shall assign one to five team members per milestone based on the number of team members and the complexity of the milestone. |
| FR05-03 | Assignments shall be based on skill matching, weekly capacity, performance score, and recorded behavioural patterns. |
| FR05-04 | The AI shall respect BLOCKER patterns and ensure that a member flagged as a blocker for a task type is never assigned to that task type. |
| FR05-05 | The AI shall generate a warning in reasoning when assigning a CAUTION pattern member. |
| FR05-06 | Group conflict patterns shall prevent two conflicting members from being co-assigned to the same milestone. |
| FR05-07 | The allocation page shall display each assignment with week number, task name, assigned resource, capacity, and AI reasoning text. |
| FR05-08 | The AI Staffer may be re-run to regenerate assignments. |
| FR05-09 | The system shall provide an Assignment Explainer that allows PMs to ask natural-language questions about why a specific member was assigned to a task, returning an AI-generated explanation. |
| FR05-10 | The allocation page shall support multiple allocation scenarios; PMs may save, compare, and apply different allocation plans. |


---

### FR06 — Worker Behavioural Pattern System

| Requirement ID | Description |
|---|---|
| FR06-01 | The system shall maintain a worker_patterns table storing task incompatibility, group conflicts, collaboration positives, and performance insights. |
| FR06-02 | Managers shall be able to record a task incompatibility pattern for a member, specifying task type, reason, and severity (info, caution, blocker). |
| FR06-03 | Managers shall be able to record a group conflict between two members with reason and severity. |
| FR06-04 | Recording a pattern shall automatically recalculate affected member performance scores, starting at 100 and deducting 20 for blocker, 10 for caution, and 3 for info. |
| FR06-05 | Patterns shall be displayed as warning badges on the member's card. |
| FR06-06 | Patterns may be resolved (PATCH), which restores the member's performance score contribution from that pattern. |
| FR06-07 | The system shall support recording positive collaboration patterns between two members, which the AI uses to prefer pairing those members. |


---

### FR07 — Live Roadmap

| Requirement ID | Description |
|---|---|
| FR07-01 | The Live Roadmap shall display all project assignments on a weekly timeline grid. |
| FR07-02 | The current week (TODAY) shall be highlighted automatically based on the project start date. |
| FR07-03 | Past weeks shall appear dimmed, while future weeks shall appear normally. |
| FR07-04 | Clicking a task row shall toggle its completion status between completed and reopened. |
| FR07-05 | The roadmap shall display a health status badge indicating On Track, Delayed (if overdue tasks exist), or All Done. |
| FR07-06 | A progress bar and stats panel shall display percentage complete, tasks done, tasks overdue, tasks remaining, and current week. |
| FR07-07 | An Activity Feed panel shall display timestamped events including task assignment, task completion, and task reopening. |
| FR07-08 | The roadmap page shall be accessible from both the project detail page and the allocation page. |
| FR07-09 | The roadmap shall include a Simulate Next Week button that advances the project simulation by one week, updating milestone statuses and activity logs. |

---

### FR08 — Financial Analytics

| Requirement ID | Description |
|---|---|
| FR08-01 | The Financial Analytics page shall calculate and display total budget (from AI analysis), forecasted total cost, and actual spent cost (completed tasks only). |
| FR08-02 | Cost per task shall be calculated as hourly_rate x estimated_hours, with a default of 20 hours per milestone if not specified. |
| FR08-03 | The system shall flag over-budget forecasts with a visual warning. |
| FR08-04 | A weekly burn-rate bar chart shall show cost distribution across all project weeks. |
| FR08-05 | A resource cost breakdown shall show per-member cost and hours. |
| FR08-06 | Managers shall be able to edit the AI-estimated budget inline with save and cancel controls. |
| FR08-07 | The analytics page shall display a velocity chart showing sprint task completion rates over time. |


---

### FR09 — Settings & Profile

| Requirement ID | Description |
|---|---|
| FR09-01 | Users shall be able to update their skill profile including job title, skills, experience level, years of experience, and weekly capacity. |
| FR09-02 | Users shall be able to re-upload a CV PDF to have skills extracted and automatically populated into their profile. |
| FR09-03 | Users shall be able to change their password with a minimum length of 6 characters and confirmation required. |
| FR09-04 | Notification preferences (task assignments, sprint events, milestone risks, and mentions) shall be configurable via toggle switches. |
| FR09-05 | The user's email address shall be displayed as read-only. |
| FR09-06 | The settings page shall display an AI Readiness completeness score (0-100%) based on how fully the user's profile is filled in. |
| FR09-07 | The settings page shall display a Performance Gauge showing the user's current AI performance score derived from sprint history and behavioural patterns. |
| FR09-08 | The settings page shall display sprint completion rate and milestone completion rate statistics for the logged-in user. |

---

### FR10 — Sprint Management

| Requirement ID | Description |
|---|---|
| FR10-01 | Owners and PMs shall be able to create sprints with a name, optional goal, start date, end date, and an optional linked milestone. |
| FR10-02 | The system shall prevent sprint creation for milestones that are already marked as completed. |
| FR10-03 | Sprints shall have three lifecycle statuses: planning, active, and completed. |
| FR10-04 | Owners and PMs shall be able to start a sprint (transition from planning to active) and close a sprint (transition from active to completed) with optional retrospective notes. |
| FR10-05 | The sprint list page shall display stats including total sprints, active sprints, planned sprints, and overall velocity percentage. |
| FR10-06 | Owners and PMs shall be able to soft-delete a sprint (move to trash); deleted sprints shall be restorable within 30 days. |
| FR10-07 | The sprint board shall display tasks in four columns: Backlog, In Progress, In Review, and Done. |
| FR10-08 | Tasks shall be movable between columns via drag-and-drop. |
| FR10-09 | Owners and PMs shall be able to use AI Populate to automatically generate sprint tasks from the linked milestone using the project's AI data and team assignments. |
| FR10-10 | Owners and PMs shall be able to manually add tasks to a sprint with title, description, effort level, time estimate, priority, and assignee. |
| FR10-11 | Team members shall be able to reassign tasks to other members from within the sprint board. |
| FR10-12 | Team members shall be able to log actual hours worked on a task. |
| FR10-13 | The sprint board shall display a live burndown bar comparing ideal progress percentage against actual completion percentage. |
| FR10-14 | The sprint board shall link to a dedicated Burndown Chart page showing the full burndown graph over the sprint duration. |
| FR10-15 | The system shall support task dependencies within a sprint; a blocked task cannot be moved to In Progress until its blocker is marked Done. |
| FR10-16 | The system shall detect and prevent circular dependency chains when adding task dependencies. |
| FR10-17 | For milestone-linked sprints, the assignee picker shall be scoped to only members assigned to that milestone. |


---

### FR11 — Gantt Chart

| Requirement ID | Description |
|---|---|
| FR11-01 | The Gantt Chart page shall render a horizontal timeline showing all project milestones and sprints as colour-coded bars. |
| FR11-02 | The timeline shall snap to the Monday of the project start week and extend to cover all sprint end dates plus a 10-day buffer. |
| FR11-03 | Week and month markers shall be displayed on the timeline header; month boundaries shall use solid lines and week boundaries shall use dashed lines. |
| FR11-04 | A vertical TODAY line and TODAY badge shall be displayed at the current date position. |
| FR11-05 | Milestone bars shall end with a diamond endpoint marker. |
| FR11-06 | Hovering over any bar shall display a tooltip with the item name, date range, and duration. |
| FR11-07 | Milestone and sprint groups shall be independently collapsible via toggle buttons in the sidebar. |
| FR11-08 | The chart shall include a colour legend for milestone statuses (Completed, In Progress, Upcoming, Blocked) and sprint statuses (Active, Planned, Completed). |

---

### FR12 — AI Risk Radar

| Requirement ID | Description |
|---|---|
| FR12-01 | The AI Risk Radar page shall automatically detect and display project risks across four categories: Sprint Burndown, Team Overload/Capacity, Behavioural Conflict, and Milestone Deadline. |
| FR12-02 | Risks shall be classified into three severity levels: Critical, High, and Medium. |
| FR12-03 | Sprint burndown risks shall be raised when time elapsed exceeds task completion rate by more than 10%, 20%, or 35% thresholds. |
| FR12-04 | Team overload risks shall be raised when a member's assigned hours exceed 80%, 100%, or 120% of their weekly capacity. |
| FR12-05 | Behavioural conflict risks shall be raised when two members with an unresolved group_conflict pattern are both active on the same sprint. |
| FR12-06 | Milestone deadline risks shall be raised for milestones due within 3 weeks that are not yet completed, with higher severity for milestones due within 1 week or currently blocked. |
| FR12-07 | Each risk card shall display severity badge, category, title, description, detail chips, and a link to the relevant page. |
| FR12-08 | The risk radar header shall show a live detection indicator with counts per severity level. |
| FR12-09 | Risk scores shall be recomputed on every page load. |

---

### FR13 — Real-Time Messaging

| Requirement ID | Description |
|---|---|
| FR13-01 | The system shall provide a real-time messaging module with a General channel (workspace-wide) and per-project channels. |
| FR13-02 | Messages shall be delivered in real time using Supabase Realtime Postgres changes subscriptions. |
| FR13-03 | Users shall be able to reply to a specific message (threaded reply preview). |
| FR13-04 | Users shall be able to pin and unpin messages; pinned state shall update in real time for all channel members. |
| FR13-05 | Users shall be able to attach files to messages; files shall be uploaded to Supabase Storage and the URL stored with the message. |
| FR13-06 | The message composer shall support @mention autocomplete for workspace team members. |
| FR13-07 | The messaging system shall automatically reconnect on connection errors with a 3-second retry delay and a manual Retry Now button. |
| FR13-08 | Users shall be able to search messages within the active channel using a search bar in the channel header. |
| FR13-09 | Message history shall be loaded on channel selection with a 10-second fetch timeout. |
| FR13-10 | Access to project channels shall be restricted; users without access shall receive an access-denied state. |


---

### FR14 — Notifications

| Requirement ID | Description |
|---|---|
| FR14-01 | The system shall create in-app notifications for the following event types: task_assigned, sprint_closed, milestone_risk, mention, and dependency_unblocked. |
| FR14-02 | Notification delivery shall respect the user's per-type preference settings (notify_tasks, notify_sprints, notify_risks, notify_mentions). |
| FR14-03 | Notifications shall be stored in a notifications table with user_id, type, title, body, link, and read status. |
| FR14-04 | Notification errors shall be non-fatal and shall never interrupt the main application flow. |

---

### FR15 — My Work (Personal Task Dashboard)

| Requirement ID | Description |
|---|---|
| FR15-01 | Each authenticated team member shall have a My Work page showing all sprint tasks assigned to them across all projects. |
| FR15-02 | Tasks shall be grouped by project and filterable by status (All, To Do, In Progress, Done). |
| FR15-03 | Team members shall be able to cycle a task's status (To Do -> In Progress -> Done -> To Do) directly from the My Work page. |
| FR15-04 | The My Work page shall display summary counts for To Do, In Progress, and Done tasks. |
| FR15-05 | Project groups shall be collapsible. |
| FR15-06 | A Refresh button shall reload the task list from the server. |

---

### FR16 — Client View

| Requirement ID | Description |
|---|---|
| FR16-01 | Users with the Client role shall be redirected to a dedicated Client View page instead of the main dashboard. |
| FR16-02 | The Client View shall display a portfolio summary showing total projects, active projects, milestone completion progress, and team headcount. |
| FR16-03 | The Client View shall display a project portfolio grid with per-project milestone completion percentage and status badge. |
| FR16-04 | The Client View shall display an upcoming milestone timeline grouped by week, showing only incomplete milestones. |
| FR16-05 | The Client View shall display a team section showing member avatars and total headcount. |
| FR16-06 | The Client View shall be read-only; clients shall have no access to sprint boards, team management, or allocation pages. |

---

### FR17 — Role-Based Access Control (RBAC)

| Requirement ID | Description |
|---|---|
| FR17-01 | The system shall enforce four roles: Owner, Project Manager (pm), Member, and Client. |
| FR17-02 | Only Owners and PMs shall be able to create, edit, and delete projects, sprints, and milestones. |
| FR17-03 | Only Owners and PMs shall be able to run AI allocation, manage team members, and view financial analytics. |
| FR17-04 | Only Owners and PMs shall be able to create project share links. |
| FR17-05 | Members shall be able to view projects, view sprint boards, update their own task statuses, and log hours. |
| FR17-06 | Clients shall only access the Client View page and public share pages. |
| FR17-07 | All API routes shall verify the caller's role server-side before performing privileged operations. |

---

### FR18 — AI Project Intelligence (Insights)

| Requirement ID | Description |
|---|---|
| FR18-01 | The system shall provide an AI Insights page where PMs can ask natural-language questions about their team, assignments, and project performance. |
| FR18-02 | The AI shall answer questions by analysing team member profiles, behavioural patterns, sprint history, milestone assignments, and recent activity. |
| FR18-03 | The AI shall provide specific, actionable answers citing member names, dates, completion rates, and pattern types. |
| FR18-04 | The Insights API shall be restricted to authenticated users with a valid workspaceId. |


---

## Non-Functional Requirements

---

### NFR01 — Performance

| Requirement ID | Description |
|---|---|
| NFR01-01 | The system will respond to 95% of user interactions within 200 milliseconds. |
| NFR01-02 | The system will support up to 1,000 concurrent users. |
| NFR01-03 | The system will complete AI-based requirement extraction within 30 seconds for documents up to 50 pages. |
| NFR01-04 | Dashboard pages will load within 2 seconds. |
| NFR01-05 | Automated test results will be available within 10 minutes. |
| NFR01-06 | Database queries will respond within 100 milliseconds. |

---

### NFR02 — Availability & Reliability

| Requirement ID | Description |
|---|---|
| NFR02-01 | The system will ensure 99.9% uptime annually. |
| NFR02-02 | The system will perform automatic backups every 24 hours. |
| NFR02-03 | The system will support a disaster recovery RTO of 4 hours. |
| NFR02-04 | The system will support an RPO of 1 hour. |
| NFR02-05 | The system will include failover mechanisms for critical components. |
| NFR02-06 | The system will manage failures without data loss. |
| NFR02-07 | The real-time messaging system shall automatically attempt reconnection on channel errors with a configurable retry delay. |

---

### NFR03 — Scalability

| Requirement ID | Description |
|---|---|
| NFR03-01 | The system will scale horizontally to support increased user load. |
| NFR03-02 | The system will support multi-tenant enterprise architecture. |
| NFR03-03 | The system will support up to 10,000 projects simultaneously. |
| NFR03-04 | The system will support up to 100,000 tasks per project. |
| NFR03-05 | The system will scale using distributed computing for AI processing. |

---

### NFR04 — Security

| Requirement ID | Description |
|---|---|
| NFR04-01 | All passwords will be encrypted using bcrypt or equivalent hashing algorithms. |
| NFR04-02 | The system will enforce role-based access control (RBAC) at both the UI and API layers. |
| NFR04-03 | The system will protect against SQL injection, XSS, and CSRF attacks. |
| NFR04-04 | Rate limiting will be applied to prevent DoS attacks. |
| NFR04-05 | Security-related events will be logged for auditing. |
| NFR04-06 | The system will support multi-factor authentication (MFA). |
| NFR04-07 | The system will comply with GDPR data privacy requirements. |
| NFR04-08 | Sensitive stored data will be encrypted. |
| NFR04-09 | User sessions will timeout after 30 minutes of inactivity. |
| NFR04-10 | The system will undergo regular security vulnerability scans. |
| NFR04-11 | Project share tokens shall be validated server-side on every access; expired or deactivated tokens shall be rejected. |
| NFR04-12 | All privileged API routes shall verify the caller's workspace membership and role using server-side Supabase admin client before executing operations. |

---

### NFR05 — Usability

| Requirement ID | Description |
|---|---|
| NFR05-01 | The system will provide an intuitive UI requiring minimal training. |
| NFR05-02 | The system will be fully responsive across desktop, tablet, and mobile devices. |
| NFR05-03 | The system will support keyboard navigation for accessibility. |
| NFR05-04 | The system will comply with WCAG 2.1 Level AA accessibility standards. |
| NFR05-05 | The system will provide contextual help and tooltips. |
| NFR05-06 | The system will support multiple languages (initially English). |
| NFR05-07 | Toast notifications shall be displayed for all user-initiated actions (task moved, sprint started, hours logged, etc.) and shall auto-dismiss after 3.5 seconds. |

---

### NFR06 — Maintainability & Portability

| Requirement ID | Description |
|---|---|
| NFR06-01 | The system will use a modular architecture for easy maintenance. |
| NFR06-02 | The system will provide detailed API documentation. |
| NFR06-03 | All code and configurations will be version-controlled. |
| NFR06-04 | The system will be deployable on AWS, Azure, and GCP. |
| NFR06-05 | The system will follow clean code practices and coding standards. |

---

### NFR07 — Integration

| Requirement ID | Description |
|---|---|
| NFR07-01 | The system will integrate with cloud storage services (Supabase Storage) for PDF and file uploads. |
| NFR07-02 | The system will support Single Sign-On (SSO) via OAuth (Google, GitHub). |
| NFR07-03 | The system shall use Supabase Realtime for live data synchronisation in the messaging module. |

---

### NFR08 — Compliance & Legal

| Requirement ID | Description |
|---|---|
| NFR08-01 | The system will comply with GDPR requirements for EU users. |
| NFR08-02 | Users will be able to export their personal data. |
| NFR08-03 | Users will be able to request deletion of their data. |
| NFR08-04 | The system will maintain audit trails for compliance reporting. |
| NFR08-05 | The system will comply with SOC 2 standards for enterprise customers. |

---

### NFR09 — Data Management

| Requirement ID | Description |
|---|---|
| NFR09-01 | The system will retain project data for at least 7 years. |
| NFR09-02 | Completed projects will be automatically archived. |
| NFR09-03 | Data retention policies will be configurable by Admin. |
| NFR09-04 | The system will support standard data export formats (JSON, CSV, XML). |
| NFR09-05 | Soft-deleted sprints shall be permanently purged after 30 days; the system shall surface a trash bin showing restorable sprints with days-remaining countdown. |


---

## Use Case Descriptions

---

### UCD-01 — User Management & Authentication

| Field | Details |
|---|---|
| Use Case Name | User Management & Authentication |
| Use Case ID | UCD-01 |
| Actors | Owner, Project Manager, Member, Client |
| Summary | Allow registered users to register, log in using email/password or OAuth (Google, GitHub), and manage session state. |
| Pre-conditions | 1. The system must be available. 2. For login, the user must already be registered. |
| Basic Flow | 1. New user opens the register page and creates an account with email and password, or uses OAuth. 2. Existing user opens the login page and enters credentials or clicks an OAuth provider. 3. System validates credentials via Supabase Auth. 4. System creates a server-side session using Supabase cookies. 5. Middleware checks session on every dashboard route; unauthenticated requests are redirected to /login. 6. User is redirected to their appropriate dashboard (or /client-view for clients). |
| Alternate Scenario | 1. Invalid credentials — error message shown, user may retry or reset password. 2. OAuth failure — provider error displayed. 3. Unauthenticated access to protected route — redirect to /login. |
| Post-conditions | 1. User session created and maintained via cookies. 2. User redirected to correct dashboard. |
| Exceptions | 1. Invalid credentials. 2. Disabled account. 3. Network error. |

---

### UCD-02 — Workspace & Onboarding

| Field | Details |
|---|---|
| Use Case Name | Workspace & Onboarding |
| Use Case ID | UCD-02 |
| Actors | Owner, Project Manager, Member |
| Summary | Guides a new user through a two-step onboarding wizard to create or join a workspace and set up their professional profile. |
| Pre-conditions | 1. User must be authenticated. 2. User must not already belong to a workspace. |
| Basic Flow | 1. System detects user has no workspace and redirects to /onboarding. 2. Step 1 — Workspace: user chooses to create a new workspace (becomes Owner) or join an existing one via invite link/ID. 3. If joining via invite link with role=pm, user is assigned the PM role automatically. 4. Step 2 — Profile: user uploads a CV PDF; AI extracts job title, skills, experience level, and years of experience. 5. User reviews and edits extracted data, then confirms. 6. System creates workspace membership and team_member record. 7. User is redirected to the dashboard. |
| Alternate Scenario | 1. CV parse fails — user can enter profile manually. 2. User skips CV upload — profile completed later in Settings. 3. Invalid workspace ID — error shown. |
| Post-conditions | 1. Workspace membership created. 2. Team member profile stored. 3. User redirected to dashboard. |
| Exceptions | 1. PDF too large (>10 MB). 2. Non-PDF file rejected. 3. Workspace not found. 4. Network error. |

---

### UCD-03 — Project Management

| Field | Details |
|---|---|
| Use Case Name | Project Management |
| Use Case ID | UCD-03 |
| Actors | Owner, Project Manager |
| Summary | Allows Owners and PMs to create projects via PDF upload, view all workspace projects, edit the project blueprint, manage share links, and soft-delete projects. |
| Pre-conditions | 1. User must be logged in as Owner or PM. 2. PDF document must be available for project creation. |
| Basic Flow | 1. PM selects New Project and uploads a PDF (Project Charter or RFP). 2. System uploads PDF to Supabase Storage and creates project with ai_status=parsing. 3. AI processes document and extracts all project data (summary, budget, milestones, risks, skills, client info, KPIs, constraints, assumptions). 4. ai_status updated to completed. 5. PM views project detail page showing extracted data, health widget, and milestone list. 6. PM opens Blueprint Editor to manually edit any extracted field. 7. PM generates a shareable read-only link (token-based, optional expiry) for external stakeholders. 8. PM soft-deletes a project when no longer needed. |
| Alternate Scenario | 1. AI fails — ai_status set to failed, error shown; PM can still edit blueprint manually. 2. Share token expired or deactivated — public viewer sees invalid link message. |
| Post-conditions | 1. Project created with full AI-extracted data. 2. Blueprint edits persisted. 3. Share tokens created/deactivated as requested. |
| Exceptions | 1. File upload error. 2. AI service unavailable. 3. Network error on save. |

---

### UCD-04 — Team Management

| Field | Details |
|---|---|
| Use Case Name | Team Management |
| Use Case ID | UCD-04 |
| Actors | Owner, Project Manager |
| Summary | Allows Owners and PMs to add, edit, remove, and invite team members, manage roles, and monitor workspace-wide capacity and utilization. |
| Pre-conditions | 1. User must be logged in as Owner or PM. 2. Workspace must exist. |
| Basic Flow | 1. PM opens the Team Dashboard. 2. PM views all members with workload, utilization %, active tasks, completed tasks, and performance score. 3. PM filters members by status (All, Online, Overloaded, Available). 4. PM adds a new member manually (name, email, job title, skills, capacity, hourly rate). 5. PM invites a member via shareable link (pre-fills workspace ID and role). 6. PM edits an existing member's profile via the Edit Member modal. 7. Owner changes a member's role via the Change Role modal. 8. PM removes a member by typing their full name to confirm; their tasks are unassigned. 9. Capacity Gauge displays workspace-wide utilization metrics. |
| Alternate Scenario | 1. Member removal cancelled — no changes made. 2. Invite link used with role=pm — new member joins as PM. |
| Post-conditions | 1. Team member added/edited/removed. 2. Role updated. 3. Capacity metrics refreshed. |
| Exceptions | 1. Duplicate email on add. 2. Network error. |

---

### UCD-05 — AI-Powered Resource Allocation

| Field | Details |
|---|---|
| Use Case Name | AI-Powered Resource Allocation |
| Use Case ID | UCD-05 |
| Actors | Owner, Project Manager, AI System |
| Summary | Uses AI to assign team members to project milestones based on skills, capacity, performance scores, and behavioural patterns. |
| Pre-conditions | 1. Project must have completed AI analysis. 2. Team members must exist in the workspace. |
| Basic Flow | 1. PM opens the Allocation page. 2. PM clicks Run AI Staffer. 3. AI analyses milestones, team skills, capacity, performance scores, and patterns. 4. AI generates assignments respecting BLOCKER and group conflict patterns; CAUTION patterns generate warnings in reasoning. 5. Assignments displayed with week, task, resource, capacity, and AI reasoning text. 6. PM uses the Assignment Explainer to ask natural-language questions about specific assignments. 7. PM may re-run the AI Staffer to regenerate assignments or save/compare multiple allocation scenarios. |
| Alternate Scenario | 1. No team members available — error shown. 2. All members blocked for a milestone — AI notes this in reasoning. |
| Post-conditions | 1. Assignments saved to project_assignments table. 2. Milestone assigned_member_ids updated. |
| Exceptions | 1. AI service unavailable. 2. Insufficient team members for all milestones. |

---

### UCD-06 — Worker Behavioural Pattern System

| Field | Details |
|---|---|
| Use Case Name | Worker Behavioural Pattern System |
| Use Case ID | UCD-06 |
| Actors | Owner, Project Manager |
| Summary | Allows Owners and PMs to record, view, and resolve behavioural patterns (task incompatibility, group conflict, positive collaboration) for team members, which directly influence AI allocation decisions and performance scores. |
| Pre-conditions | 1. User must be Owner or PM. 2. Team members must exist in the workspace. |
| Basic Flow | 1. PM opens the Team page and selects a member. 2. PM records a task incompatibility pattern (task type, reason, severity: info/caution/blocker). 3. System saves the pattern and automatically recalculates the member's performance score (deduct 20/10/3 for blocker/caution/info). 4. Pattern badge appears on the member's card. 5. PM records a group conflict between two members (reason, severity). 6. PM records a positive collaboration pattern between two members. 7. PM resolves a pattern — performance score contribution is restored. |
| Alternate Scenario | 1. Positive collaboration pattern recorded — AI prefers pairing those members on future allocations. |
| Post-conditions | 1. Pattern saved. 2. Performance score updated. 3. AI allocation respects new pattern on next run. |
| Exceptions | 1. Network error on save. |

---

### UCD-07 — Live Roadmap

| Field | Details |
|---|---|
| Use Case Name | Live Roadmap |
| Use Case ID | UCD-07 |
| Actors | Owner, Project Manager, Member |
| Summary | Displays a weekly timeline of all project assignments with live completion toggling, health status, progress stats, activity feed, and a simulation control. |
| Pre-conditions | 1. Project must have completed AI analysis and assignments. |
| Basic Flow | 1. User opens the Roadmap page (accessible from project detail or allocation page). 2. System displays a weekly grid; current week is highlighted, past weeks are dimmed. 3. User clicks a task row to toggle its completion status (completed ↔ reopened). 4. Activity feed updates with a timestamped event. 5. Health badge updates (On Track / Delayed / All Done). 6. Progress bar and stats panel refresh (% complete, tasks done, overdue, remaining, current week). 7. PM clicks Simulate Next Week to advance the project simulation by one week. |
| Alternate Scenario | 1. No assignments — empty state shown. 2. All tasks complete — All Done badge displayed. |
| Post-conditions | 1. Task status updated. 2. Activity event logged. 3. Progress stats refreshed. |
| Exceptions | 1. Network error on toggle. |

---

### UCD-08 — Financial Analytics

| Field | Details |
|---|---|
| Use Case Name | Financial Analytics |
| Use Case ID | UCD-08 |
| Actors | Owner, Project Manager |
| Summary | Displays budget vs. forecast vs. actual cost analysis with a burn-rate chart, per-member cost breakdown, and sprint velocity chart. |
| Pre-conditions | 1. Project must have completed AI analysis. 2. User must be Owner or PM. |
| Basic Flow | 1. PM opens the Analytics page. 2. System calculates total budget (from AI), forecasted total cost (all tasks), and actual spent (completed tasks only). 3. Cost per task = hourly_rate × estimated_hours (default 20h if not specified). 4. Over-budget warning displayed if forecast exceeds budget. 5. Weekly burn-rate bar chart rendered showing cost distribution across project weeks. 6. Per-member cost and hours breakdown shown. 7. Velocity chart shows sprint task completion rates over time. 8. PM edits the AI-estimated budget inline with save/cancel controls. |
| Alternate Scenario | 1. No assignments — zero costs shown. 2. Budget edit cancelled — original value restored. |
| Post-conditions | 1. Budget edit saved to database. |
| Exceptions | 1. Network error on budget save. |

---

### UCD-09 — Settings & Profile

| Field | Details |
|---|---|
| Use Case Name | Settings & Profile |
| Use Case ID | UCD-09 |
| Actors | All Users |
| Summary | Allows users to manage their AI profile, change their password, and configure notification preferences from the Settings page. |
| Pre-conditions | 1. User must be logged in. |
| Basic Flow | 1. User opens Settings. 2. System displays the profile with AI Readiness completeness score and Performance Gauge. 3. Profile tab: user edits name, job title, experience level, years of experience, weekly capacity, and skill stack. 4. User optionally uploads a CV PDF to auto-extract skills via AI. 5. User saves profile — system confirms update. 6. Security tab: user enters new password and confirmation (min 6 chars); system updates via Supabase Auth. 7. Preferences tab: user toggles notification preferences (task assignments, sprint events, milestone risks, mentions). |
| Alternate Scenario | 1. CV parse fails — error shown, manual entry still available. 2. Passwords do not match — error shown. 3. Cancel exits without saving. |
| Post-conditions | 1. Profile updated. 2. AI Readiness score recalculated. 3. Password changed. 4. Notification preferences saved. |
| Exceptions | 1. PDF too large (>10 MB). 2. Non-PDF file rejected. 3. Password too short. 4. Network error on save. |

---

### UCD-10 — Sprint Management

| Field | Details |
|---|---|
| Use Case Name | Sprint Management |
| Use Case ID | UCD-10 |
| Actors | Owner, Project Manager, Member |
| Summary | Allows Owners and PMs to create, start, close, delete, and restore sprints, and allows all members to manage tasks on the sprint Kanban board. |
| Pre-conditions | 1. Project must exist with completed AI analysis. 2. User must be a workspace member. |
| Basic Flow | 1. PM opens Sprint Planning page and clicks New Sprint. 2. PM enters name, goal, dates, and optionally links a milestone (completed milestones are blocked). 3. Sprint created with status=planning. 4. PM starts sprint (status=active). 5. PM opens the sprint board — four columns: Backlog, In Progress, In Review, Done. 6. PM uses AI Populate to generate tasks from the linked milestone. 7. PM or member manually adds tasks (title, description, effort, time estimate, priority, assignee). 8. Members drag tasks between columns; blocked tasks (unmet dependencies) cannot move to In Progress. 9. Members reassign tasks and log actual hours. 10. Sprint board shows live burndown bar and links to full Burndown Chart. 11. PM closes sprint with optional retrospective notes (status=completed). 12. PM soft-deletes a sprint (restorable within 30 days via trash bin). |
| Alternate Scenario | 1. Blocked task dragged to In Progress — toast shown, move rejected. 2. AI Populate disabled for standalone sprints. 3. Circular dependency detected — add rejected with error. |
| Post-conditions | 1. Sprint lifecycle managed. 2. Task statuses updated. 3. Burndown reflects current progress. |
| Exceptions | 1. Missing required fields on sprint creation. 2. Drag-and-drop fails — optimistic update reverted. 3. Network error. |

---

### UCD-11 — Gantt Chart

| Field | Details |
|---|---|
| Use Case Name | Gantt Chart |
| Use Case ID | UCD-11 |
| Actors | Owner, Project Manager, Member |
| Summary | Displays a horizontal timeline Gantt chart showing all project milestones and sprints as colour-coded bars with today marker, tooltips, and collapsible groups. |
| Pre-conditions | 1. Project must have completed AI analysis. 2. At least one milestone or sprint must exist. |
| Basic Flow | 1. User opens the Gantt Chart page from the project detail page. 2. System renders a horizontal timeline snapped to the Monday of the project start week. 3. Milestones displayed as colour-coded bars (Completed=green, In Progress=indigo, Upcoming=slate, Blocked=red) with diamond endpoint markers. 4. Sprints displayed as colour-coded bars (Active=orange, Planned=violet, Completed=green). 5. Week and month markers shown in the header; today is marked with a vertical line and TODAY badge. 6. User hovers over a bar to see a tooltip with name, date range, and duration. 7. User collapses/expands milestone or sprint groups independently. 8. Colour legend displayed at the bottom of the chart. |
| Alternate Scenario | 1. No milestones and no sprints — empty state shown with guidance. |
| Post-conditions | 1. Chart rendered and interactive. |
| Exceptions | 1. Project start date missing — timeline defaults to first sprint start date. |

---

### UCD-12 — AI Risk Radar

| Field | Details |
|---|---|
| Use Case Name | AI Risk Radar |
| Use Case ID | UCD-12 |
| Actors | Owner, Project Manager |
| Summary | Automatically detects and surfaces project risks across sprint burndown, team capacity, behavioural conflicts, and milestone deadlines, classified by severity. |
| Pre-conditions | 1. Project must have active sprints and/or milestones. 2. User must be Owner or PM. |
| Basic Flow | 1. PM opens the Risk Radar page. 2. System computes risks from live sprint burndown data, team capacity vs. assigned hours, unresolved behavioural patterns, and milestone deadlines. 3. Risks classified into Critical, High, and Medium severity. 4. Risks displayed grouped by severity with category, title, description, detail chips, and a link to the relevant page. 5. Header shows live detection indicator with counts per severity level. 6. If no risks detected — All Clear state shown. |
| Alternate Scenario | 1. No active sprints — sprint burndown risks not computed. 2. No patterns — behavioural conflict risks not raised. |
| Post-conditions | 1. Risk list displayed. Recomputed on every page load. |
| Exceptions | 1. Data fetch error — partial risk list shown with available data. |

---

### UCD-13 — Real-Time Messaging

| Field | Details |
|---|---|
| Use Case Name | Real-Time Messaging |
| Use Case ID | UCD-13 |
| Actors | Owner, Project Manager, Member |
| Summary | Allows workspace members to communicate in real time via a General channel and per-project channels, with support for replies, pinning, file attachments, @mentions, and message search. |
| Pre-conditions | 1. User must be a workspace member. |
| Basic Flow | 1. User opens the Messages page. 2. Sidebar shows a General channel and one channel per project. 3. User selects a channel — message history loads (10-second timeout). 4. User types a message; @mention autocomplete suggests workspace members. 5. User optionally attaches a file (uploaded to Supabase Storage). 6. Message sent and delivered in real time to all channel members via Supabase Realtime. 7. User replies to a specific message — reply preview shown in the thread. 8. User pins/unpins a message — pinned state updates in real time for all members. 9. User searches messages within the channel using the search bar. |
| Alternate Scenario | 1. Connection error — reconnect banner shown with Retry Now button; auto-retry after 3 seconds. 2. Access denied to project channel — access-denied state shown. 3. Send fails — error message shown with retry option. |
| Post-conditions | 1. Message stored in database and delivered to all channel members. |
| Exceptions | 1. File upload failure. 2. Send timeout. 3. Realtime subscription error — auto-reconnect triggered. |

---

### UCD-14 — Notifications

| Field | Details |
|---|---|
| Use Case Name | Notifications |
| Use Case ID | UCD-14 |
| Actors | Owner, Project Manager, Member |
| Summary | The system automatically creates and delivers in-app notifications to users based on workspace events, respecting each user's notification preferences. |
| Pre-conditions | 1. User must be a workspace member. 2. A triggering event must occur (task assigned, sprint closed, milestone risk, mention, or dependency unblocked). |
| Basic Flow | 1. A triggering event occurs (e.g. a task is assigned to a member). 2. System checks the target user's notification preference for that event type. 3. If the preference is enabled (or not explicitly disabled), system inserts a notification record with type, title, body, and optional link. 4. Notification appears in the user's notification feed. 5. User reads or dismisses the notification. |
| Alternate Scenario | 1. User has disabled the relevant notification preference — notification is silently skipped. 2. Notification insert fails — error is caught silently and does not interrupt the main flow. |
| Post-conditions | 1. Notification stored in the notifications table. 2. User is informed of the event. |
| Exceptions | 1. Database error on insert — non-fatal, swallowed silently. 2. Invalid user ID — notification skipped. |

---

### UCD-15 — My Work (Personal Task Dashboard)

| Field | Details |
|---|---|
| Use Case Name | My Work |
| Use Case ID | UCD-15 |
| Actors | Member, Owner, Project Manager |
| Summary | Allows any authenticated team member to view and manage all sprint tasks assigned to them across all projects from a single personal dashboard. |
| Pre-conditions | 1. User must be logged in and belong to a workspace. 2. At least one sprint task must be assigned to the user. |
| Basic Flow | 1. User navigates to My Work. 2. System fetches all sprint tasks assigned to the user across all workspace projects. 3. Tasks are grouped by project and displayed with status badges. 4. User filters tasks by status (All, To Do, In Progress, Done). 5. User clicks a task's status icon to cycle it to the next status. 6. System updates the task status in the database. 7. User collapses or expands project groups as needed. |
| Alternate Scenario | 1. No tasks assigned — empty state shown with guidance message. 2. Status update fails — UI reverts to previous state. |
| Post-conditions | 1. Task status updated. 2. Summary counts refreshed. |
| Exceptions | 1. Network error on status update. 2. User not linked to a team_member record — empty state shown. |

---

### UCD-16 — Client View

| Field | Details |
|---|---|
| Use Case Name | Client View |
| Use Case ID | UCD-16 |
| Actors | Client |
| Summary | Provides clients with a read-only portfolio overview of projects, milestones, and team headcount. |
| Pre-conditions | 1. User must be logged in with the Client role. |
| Basic Flow | 1. Client logs in. 2. System detects Client role and redirects to /dashboard/client-view. 3. Client sees portfolio summary (total projects, active projects, milestone completion %, team headcount). 4. Client views project portfolio grid with per-project milestone completion and status badge. 5. Client views upcoming milestone timeline grouped by week (incomplete milestones only). 6. Client views team section showing member avatars and total headcount. |
| Alternate Scenario | 1. Non-client user accessing /client-view is redirected to /dashboard. 2. No projects in workspace — empty state shown. |
| Post-conditions | 1. Client views read-only project data. |
| Exceptions | 1. No projects in workspace — empty state shown. |

---

### UCD-17 — Role-Based Access Control (RBAC)

| Field | Details |
|---|---|
| Use Case Name | Role-Based Access Control |
| Use Case ID | UCD-17 |
| Actors | Owner, Project Manager, Member, Client, System |
| Summary | The system enforces four roles (Owner, PM, Member, Client) at both the UI and API layers, restricting access to features and data based on the authenticated user's role. |
| Pre-conditions | 1. User must be authenticated. 2. User must belong to a workspace with an assigned role. |
| Basic Flow | 1. User attempts to access a feature or API route. 2. System resolves the user's role by checking the workspaces table (owner) and workspace_members table (role column). 3. System evaluates the role against the required permission (e.g. canManageProject, canCreateSprint). 4. If permitted, the action proceeds. 5. If not permitted, the UI hides the control or the API returns 403 Forbidden. |
| Alternate Scenario | 1. Client role detected on login — user redirected to /dashboard/client-view. 2. Non-client accessing /client-view — redirected to /dashboard. 3. Member attempting a PM-only API action — 403 returned. |
| Post-conditions | 1. Permitted actions execute normally. 2. Forbidden actions blocked with appropriate feedback. |
| Exceptions | 1. Role lookup fails — defaults to least-privileged (member) role. 2. Workspace not found — user redirected to /onboarding. |

---

### UCD-18 — AI Project Intelligence (Insights)

| Field | Details |
|---|---|
| Use Case Name | AI Project Intelligence |
| Use Case ID | UCD-18 |
| Actors | Owner, Project Manager |
| Summary | Allows PMs to ask natural-language questions about team performance, assignments, and project health, receiving AI-generated answers backed by live workspace data. |
| Pre-conditions | 1. User must be Owner or PM. 2. Workspace must have team members and project data. |
| Basic Flow | 1. PM opens the Insights page. 2. PM types a natural-language question (e.g. "Why was Alice assigned to the backend milestone?"). 3. System sends the question with full workspace context (members, patterns, sprints, milestones, activity) to the AI. 4. AI returns a specific, data-backed answer citing names, dates, completion rates, and pattern types. 5. Answer displayed in the chat interface. |
| Alternate Scenario | 1. No data available — AI states this honestly and recommends what data would help. 2. AI service unavailable — error message shown. |
| Post-conditions | 1. AI-generated answer displayed to the PM. |
| Exceptions | 1. AI service unavailable. 2. Network timeout. |

---

## Requirements Traceability Matrix

| Requirement No. | Requirement Description | Use Cases |
|---|---|---|
| FR01 | User Management & Authentication | UCD-01 |
| FR02 | Workspace & Onboarding | UCD-02 |
| FR03 | Project Management | UCD-03 |
| FR04 | Team Management | UCD-04 |
| FR05 | AI-Powered Resource Allocation | UCD-05 |
| FR06 | Worker Behavioural Pattern System | UCD-06 |
| FR07 | Live Roadmap | UCD-07 |
| FR08 | Financial Analytics | UCD-08 |
| FR09 | Settings & Profile | UCD-09 |
| FR10 | Sprint Management | UCD-10 |
| FR11 | Gantt Chart | UCD-11 |
| FR12 | AI Risk Radar | UCD-12 |
| FR13 | Real-Time Messaging | UCD-13 |
| FR14 | Notifications | UCD-14 |
| FR15 | My Work (Personal Task Dashboard) | UCD-15 |
| FR16 | Client View | UCD-16 |
| FR17 | Role-Based Access Control | UCD-17 |
| FR18 | AI Project Intelligence (Insights) | UCD-18 |

