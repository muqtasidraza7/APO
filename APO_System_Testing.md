# Assistant Project Officer (APO) — System Testing

---

## Test Cases Design

---

### TC01 — User Management & Authentication (FR01)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC01-01 | Login with valid email and password | User is registered | Enter valid email and password, click Sign In | User session created, redirected to dashboard |
| TC01-02 | Login with invalid password | User is registered | Enter valid email with wrong password | Error: Invalid login credentials |
| TC01-03 | Login with unregistered email | - | Enter unregistered email and any password | Error: Invalid login credentials |
| TC01-04 | Login with empty fields | - | Leave email and password empty and submit | Validation error: fields required |
| TC01-05 | OAuth login via Google | - | Click Google OAuth button | Redirect to Google consent screen, then to dashboard or /onboarding |
| TC01-06 | OAuth login via GitHub | - | Click GitHub OAuth button | Redirect to GitHub consent screen, then to dashboard or /onboarding |
| TC01-07 | Access protected route without authentication | User not logged in | Navigate directly to /dashboard | Redirect to /login |
| TC01-08 | Session persistence after browser close | User is logged in | Close and reopen browser tab | User remains logged in via server-side cookie |
| TC01-09 | Session timeout after inactivity | User is logged in | Leave session idle for 30 minutes | Session expires, redirect to /login on next action |
| TC01-10 | Register with valid email and password | - | Enter new email and strong password, submit | Account created, redirected to /onboarding |
| TC01-11 | Register with existing email | - | Enter already-registered email | Error: User already registered |
| TC01-12 | Forgot password — registered email | User is registered | Enter registered email on forgot-password page | Password reset email sent |
| TC01-13 | Forgot password — unregistered email | - | Enter unregistered email | Appropriate error or silent success (no leak) |
| TC01-14 | Change password with valid inputs | User is logged in | Enter new password (>=6 chars) and matching confirmation | Password updated, confirmation shown |
| TC01-15 | Change password — mismatch | User is logged in | Enter different values in new password and confirm fields | Error: Passwords must match |
| TC01-16 | Change password — too short | User is logged in | Enter password shorter than 6 characters | Error: Minimum 6 characters |
| TC01-17 | Client role redirect on login | Client user is registered | Log in as client | Redirected to /dashboard/client-view instead of /dashboard |


---

### TC02 — Workspace & Onboarding (FR02)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC02-01 | Create new workspace | New user with no workspace | Enter workspace name and click Create New | Workspace created, user assigned as Owner, redirected to dashboard |
| TC02-02 | Join workspace via invite link | Invite link with workspace_id available | Open invite URL and complete onboarding | User added to existing workspace as Member |
| TC02-03 | Join workspace via invite link with role=pm | Invite link with role=pm parameter | Open invite URL | User added as Project Manager role |
| TC02-04 | Redirect to /onboarding when no workspace | Authenticated user with no workspace | Navigate to /dashboard | Redirect to /onboarding |
| TC02-05 | Onboarding Step 1 — empty workspace name | - | Leave workspace name empty and click Next | Validation error: workspace name required |
| TC02-06 | Onboarding Step 2 — CV upload and AI extraction | - | Upload valid PDF CV | Skills, job title, experience level, years of experience auto-populated |
| TC02-07 | Onboarding — non-PDF CV upload | - | Upload .docx or .jpg file | Error: PDF files only |
| TC02-08 | Onboarding — CV file too large | - | Upload PDF larger than 10 MB | Error: File is too large. Maximum size is 10 MB |
| TC02-09 | Onboarding — manual skill entry | - | Type skill name and press Enter or click Add | Skill tag added to profile |
| TC02-10 | Onboarding — remove extracted skill | CV extracted skills shown | Click X on a skill tag | Skill removed from list |
| TC02-11 | Onboarding — skip CV upload | - | Click Skip for now | Redirected to dashboard with empty skill profile |
| TC02-12 | Onboarding — invalid workspace ID on join | - | Enter non-existent workspace ID | Error: Workspace not found |
| TC02-13 | Paste full invite URL in join field | Invite URL available | Paste full URL into workspace ID field | System extracts workspace_id from URL and populates field |


---

### TC03 — Project Management (FR03)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC03-01 | Create project with valid PDF | Owner or PM logged in, workspace exists | Upload valid PDF and submit | Project created with ai_status=parsing, AI analysis triggered |
| TC03-02 | AI analysis completes successfully | PDF uploaded | Wait for processing | ai_status=completed, milestones, budget, risks, skills visible |
| TC03-03 | AI analysis failure on corrupted PDF | - | Upload corrupted or unreadable PDF | ai_status=failed, error state shown on project page |
| TC03-04 | Upload non-PDF file for project | - | Attempt to upload .jpg or .docx | Error: Only PDF files are supported, project not created |
| TC03-05 | View project detail page | Project with ai_status=completed | Open project detail page | Summary, budget, timeline, milestones, required skills, risks displayed |
| TC03-06 | Edit milestone title and deliverable | Project completed | Select milestone, update title and deliverable, save | Milestone updated and reflected on page |
| TC03-07 | Edit milestone status | Project completed | Change milestone status to in_progress or completed | Status updated and roadmap reflects change |
| TC03-08 | Soft-delete project with confirmation | Project exists | Click delete, type confirmation, submit | Project removed from list, soft-deleted in DB |
| TC03-09 | Open Project Blueprint Editor | Owner or PM, project exists | Click Edit Blueprint | Drawer opens with Overview, Milestones, Risks & Skills tabs |
| TC03-10 | Save blueprint with valid data | Blueprint editor open | Edit fields across all tabs and click Save Blueprint | Changes persisted, drawer closes, project detail refreshes |
| TC03-11 | Save blueprint with missing milestone title | Blueprint editor open | Leave milestone title empty and click Save | Error: Milestone N is missing a title or deliverable |
| TC03-12 | Generate project share link | Owner or PM, project exists | Click Generate Share Link | Token created, shareable URL displayed |
| TC03-13 | Access valid share link as unauthenticated user | Share link created and active | Open /share/[token] in browser without login | Read-only project milestones and summary displayed |
| TC03-14 | Access expired share link | Share link with past expiry | Open /share/[token] | Error: Link expired or invalid |
| TC03-15 | Deactivate share link | Owner or PM, share link exists | Click deactivate on share link | Link marked inactive, subsequent access returns invalid |
| TC03-16 | Global search returns matching results | Projects and members exist | Type search query in global search | Matching projects, members, and tasks shown |
| TC03-17 | Global search with no results | - | Type query with no matches | Empty state: No results found |


---

### TC04 — Team Management (FR04)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC04-01 | Add team member manually | Owner or PM logged in | Enter name, email, job title, skills, capacity, hourly rate and submit | Member added and appears in team roster |
| TC04-02 | Add team member with missing required fields | - | Leave name or email empty and submit | Validation error shown |
| TC04-03 | Generate and copy invite link | Owner or PM logged in | Click Copy Invite Link | Link copied to clipboard, usable for onboarding |
| TC04-04 | Filter members — Overloaded | Members with >=90% utilization exist | Select Overloaded filter | Only overloaded members displayed |
| TC04-05 | Filter members — Available | Members with <50% utilization exist | Select Available filter | Only available members displayed |
| TC04-06 | Filter members — All | Any members exist | Select All filter | All workspace members displayed |
| TC04-07 | Remove member with correct name confirmation | Member exists | Type exact member full name and confirm | Member removed, assigned tasks become unassigned |
| TC04-08 | Remove member with incorrect name | Member exists | Type wrong name and attempt confirm | Removal blocked, confirmation not accepted |
| TC04-09 | Edit member profile | Owner or PM, member exists | Open Edit Member modal, change job title and skills, save | Member profile updated in DB |
| TC04-10 | Change member role | Owner logged in | Open Change Role modal, select new role, confirm | Member role updated, role badge changes on card |
| TC04-11 | Capacity Gauge displays correct metrics | Team with assigned tasks exists | Open team dashboard | Total members, tasks, available hours, workload distribution shown accurately |
| TC04-12 | Workload updates after task completion | Member has active tasks | Mark a sprint task as done | Member utilization percentage and active task count updated |
| TC04-13 | View team member edit history | Owner or PM | Open member edit history | Timestamped list of changes shown |
| TC04-14 | Role badge colour coding | Members with different roles exist | View team dashboard | Owner=violet, PM=indigo, Member=slate, Client=amber badges shown |


---

### TC05 — AI-Powered Resource Allocation (FR05)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC05-01 | Run AI Staffer for project allocation | Project with milestones and team members exists | Click Run AI Staffer | All milestones assigned to suitable team members with reasoning |
| TC05-02 | Assignment respects skill matching | Team members with different skills exist | Run AI allocation | Tasks assigned to members whose skills match milestone requirements |
| TC05-03 | Assignment respects weekly capacity | Members with different capacity values exist | Run AI allocation | Members not assigned beyond their weekly capacity |
| TC05-04 | BLOCKER pattern prevents assignment | Member has BLOCKER pattern for a task type | Run AI allocation | BLOCKER member not assigned to restricted task type |
| TC05-05 | CAUTION pattern generates warning | Member has CAUTION pattern | Run AI allocation | Member may be assigned but reasoning includes caution warning |
| TC05-06 | Group conflict prevents co-assignment | Two members have group_conflict pattern | Run AI allocation | Conflicting members not assigned to same milestone |
| TC05-07 | Allocation with no team members | No team members in workspace | Click Run AI Staffer | Error: No team members available |
| TC05-08 | Re-run AI Staffer replaces previous allocation | Existing allocation present | Click Re-run AI Staffer | Previous assignments replaced with new allocation |
| TC05-09 | View AI reasoning for each assignment | Allocation exists | Open allocation page | Each assignment shows AI reasoning text |
| TC05-10 | Assignment Explainer — valid question | Allocation exists | Type question in Assignment Explainer | AI returns specific answer citing skills, patterns, and capacity |
| TC05-11 | Save allocation scenario | Allocation exists | Click Save Scenario | Scenario saved and available for comparison |
| TC05-12 | Compare two allocation scenarios | Two scenarios saved | Open scenario comparison | Side-by-side comparison of assignments shown |
| TC05-13 | Apply allocation scenario | Scenario saved | Click Apply Scenario | Selected scenario becomes active allocation |


---

### TC06 — Worker Behavioural Pattern System (FR06)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC06-01 | Record task incompatibility pattern | At least one team member exists | Enter task type, reason, severity=BLOCKER and save | Pattern saved, performance score decreases by 20 |
| TC06-02 | Record task incompatibility — CAUTION severity | Member exists | Enter task type, reason, severity=CAUTION and save | Pattern saved, performance score decreases by 10 |
| TC06-03 | Record task incompatibility — INFO severity | Member exists | Enter task type, reason, severity=INFO and save | Pattern saved, performance score decreases by 3 |
| TC06-04 | Record group conflict between two members | Two members exist | Select two different members, enter reason and severity, save | Conflict pattern saved, both members' scores updated |
| TC06-05 | Prevent group conflict with same member selected | Member exists | Select same member in both conflict fields | Error: Must select two different members |
| TC06-06 | Record positive collaboration pattern | Two members exist | Select two members, enter reason, save as collaboration_positive | Pattern saved, AI will prefer pairing these members |
| TC06-07 | Resolve existing pattern | Pattern exists | Click Resolve on pattern | Pattern marked resolved, performance score restored |
| TC06-08 | Performance score floor at 0 | Member has many patterns | Add multiple BLOCKER patterns | Score does not go below 0 |
| TC06-09 | Pattern badge displayed on member card | Pattern exists | View team dashboard | Warning badge shown on affected member card |
| TC06-10 | Multiple patterns accumulate correctly | Member has 2 CAUTION and 1 BLOCKER | View member performance score | Score = 100 - 20 - 10 - 10 = 60 |
| TC06-11 | AI allocation respects new pattern after recording | Pattern recorded after previous allocation | Re-run AI Staffer | New allocation respects the newly recorded pattern |


---

### TC07 — Live Roadmap (FR07)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC07-01 | View roadmap with assignments | Allocation completed | Navigate to roadmap page | Weekly timeline grid displays all project assignments |
| TC07-02 | Current week highlighted as TODAY | Project has started | Open roadmap | Current week column highlighted and labelled TODAY |
| TC07-03 | Past weeks appear dimmed | Project started more than 1 week ago | Open roadmap | Past week columns visually dimmed |
| TC07-04 | Toggle task to completed | Task exists in roadmap | Click task row | Task marked completed, activity feed updated, progress stats recalculate |
| TC07-05 | Toggle task back to reopened | Task is completed | Click completed task row | Task reopened, activity feed updated |
| TC07-06 | Health badge — On Track | All tasks on schedule | View roadmap | Health badge shows On Track |
| TC07-07 | Health badge — Delayed | Overdue tasks exist | View roadmap | Health badge shows Delayed |
| TC07-08 | Health badge — All Done | All tasks completed | View roadmap | Health badge shows All Done |
| TC07-09 | Progress bar accuracy | Tasks with partial completion | Open roadmap | Progress bar and stats show correct % complete, tasks done, overdue, remaining |
| TC07-10 | Activity feed shows task completion event | Task toggled to completed | View activity feed panel | Timestamped entry for task_completed appears |
| TC07-11 | Activity feed shows task reopened event | Task toggled back to open | View activity feed panel | Timestamped entry for task_reopened appears |
| TC07-12 | Simulate Next Week advances project | Project has active assignments | Click Simulate Next Week | Milestone statuses advance, activity log updated |
| TC07-13 | Roadmap accessible from project detail | Project detail page open | Click roadmap link | Navigates to roadmap page |
| TC07-14 | Roadmap accessible from allocation page | Allocation page open | Click roadmap link | Navigates to roadmap page |
| TC07-15 | Empty state when no assignments | No allocation run | Navigate to roadmap | Empty state shown with instruction to run allocation |

---

### TC08 — Financial Analytics (FR08)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC08-01 | View financial analytics page | Allocations and hourly rates exist | Navigate to analytics page | Total budget, forecasted cost, actual spent displayed correctly |
| TC08-02 | Over-budget warning displayed | Forecasted cost exceeds budget | View analytics | Visual over-budget warning shown |
| TC08-03 | Under-budget — no warning | Forecasted cost within budget | View analytics | No warning shown, status indicates within budget |
| TC08-04 | Weekly burn-rate chart renders | Assignments across multiple weeks exist | Open analytics | Bar chart shows cost distribution per week |
| TC08-05 | Per-member cost breakdown | Multiple members with hourly rates assigned | Open analytics | Each member's total cost and hours shown |
| TC08-06 | Cost calculation — default 20 hours | Milestone with no time estimate | View analytics | Cost calculated as hourly_rate x 20 hours |
| TC08-07 | Actual spent — completed tasks only | Mix of completed and pending tasks | View analytics | Actual spent reflects only completed task costs |
| TC08-08 | Edit budget inline | Owner or PM, project exists | Click edit on budget, enter new value, save | Updated budget stored and reflected immediately |
| TC08-09 | Cancel budget edit | Budget edit in progress | Click cancel | Original budget value restored, no change saved |
| TC08-10 | Velocity chart renders | Completed sprints with tasks exist | Open analytics | Sprint completion rate chart displayed |
| TC08-11 | Zero costs when no allocation | No resource allocation exists | Navigate to analytics | All costs shown as zero, no breakdown displayed |


---

### TC09 — Settings & Profile (FR09)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC09-01 | Update job title and experience level | User logged in | Modify job title, select experience level, save | Profile updated with confirmation message |
| TC09-02 | Add skill manually | User profile exists | Type skill name and click Add | Skill tag added to profile |
| TC09-03 | Add skill via keyboard Enter | User profile exists | Type skill and press Enter | Skill tag added to profile |
| TC09-04 | Remove skill from profile | Skills exist in profile | Click X on skill tag | Skill removed from profile |
| TC09-05 | Adjust weekly capacity slider | User logged in | Drag capacity slider to new value | Capacity value updates in real time |
| TC09-06 | Re-upload CV and auto-update profile | User in settings | Upload new PDF CV and click Extract | Skills, job title, experience level updated automatically |
| TC09-07 | CV upload — non-PDF rejected | - | Upload .docx file | Error: PDF files only |
| TC09-08 | Change password successfully | User logged in | Enter new password >=6 chars and matching confirmation | Password updated, success message shown |
| TC09-09 | Change password — mismatch | User logged in | Enter different values in new and confirm fields | Error: Passwords must match |
| TC09-10 | Change password — too short | User logged in | Enter password shorter than 6 characters | Error: Minimum 6 characters |
| TC09-11 | Toggle notification preference — tasks | User logged in | Toggle notify_tasks off | Preference saved, task notifications no longer delivered |
| TC09-12 | Toggle notification preference — sprints | User logged in | Toggle notify_sprints off | Preference saved |
| TC09-13 | Toggle notification preference — risks | User logged in | Toggle notify_risks off | Preference saved |
| TC09-14 | Toggle notification preference — mentions | User logged in | Toggle notify_mentions off | Preference saved |
| TC09-15 | Email field is read-only | User logged in | Attempt to edit email field | Field remains disabled and non-editable |
| TC09-16 | AI Readiness score reflects profile completeness | Profile partially filled | View settings page | Completeness score (0-100%) shown accurately |
| TC09-17 | Performance Gauge reflects score | Member has patterns and sprint history | View settings page | Gauge shows correct performance score with label |
| TC09-18 | Sprint and milestone completion rates shown | Member has sprint history | View settings page | Sprint rate and milestone rate statistics displayed |


---

### TC10 — Sprint Management (FR10)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC10-01 | Create sprint with valid inputs | Owner or PM, project exists | Enter name, goal, start date, end date, click Create | Sprint created with status=planning, appears in Upcoming section |
| TC10-02 | Create sprint with missing required fields | - | Leave name or dates empty | Validation error: Name, start date and end date are required |
| TC10-03 | Create sprint linked to a milestone | Milestones exist | Select milestone from dropdown during creation | Sprint linked to milestone, milestone shown on sprint card |
| TC10-04 | Block sprint creation for completed milestone | Milestone marked completed | Select completed milestone and create | Error: Milestone already completed, sprint not created |
| TC10-05 | Start sprint transitions to active | Sprint in planning status | Click Start Sprint | Sprint status changes to active, appears in Active section |
| TC10-06 | Close sprint with retrospective notes | Sprint is active | Click Close Sprint, enter notes, confirm | Sprint status changes to completed, notes saved |
| TC10-07 | Sprint velocity displayed on list page | Sprints with tasks exist | View sprint list page | Velocity % calculated and shown in stats cards |
| TC10-08 | Soft-delete sprint | Owner or PM, sprint exists | Click delete, confirm | Sprint moved to trash, removed from active list |
| TC10-09 | Restore sprint from trash within 30 days | Sprint in trash | Click Restore | Sprint restored to planning status, appears in list |
| TC10-10 | Trash bin shows days remaining | Sprint in trash | Open trash bin | Days remaining before permanent deletion shown |
| TC10-11 | AI Populate generates tasks for milestone sprint | Sprint linked to milestone with team assigned | Click AI Populate | Tasks generated in Backlog column based on milestone data |
| TC10-12 | AI Populate disabled for standalone sprint | Sprint not linked to milestone | View sprint board | AI Populate button disabled or shows warning |
| TC10-13 | Add task manually | Sprint exists | Click New Task, fill form, submit | Task appears in Backlog column |
| TC10-14 | Add task with missing title | - | Leave title empty and submit | Error: Title is required |
| TC10-15 | Drag task to In Progress | Task in Backlog, no blockers | Drag task to In Progress column | Task moves to In Progress |
| TC10-16 | Drag blocked task to In Progress | Task has unmet dependency | Drag task to In Progress | Toast: Blocked by [task name], move rejected |
| TC10-17 | Drag task to Done | Task in In Progress | Drag task to Done column | Task moves to Done, toast: task completed |
| TC10-18 | Reassign task to different member | Task exists, team members exist | Click assignee, select different member | Task reassigned, assignee avatar updates |
| TC10-19 | Log actual hours on task | Task exists | Click log hours, enter value, confirm | Actual hours saved, shown on task card |
| TC10-20 | Add task dependency | Two tasks exist in sprint | Select task, add dependency on another task | Dependency created, blocked task shows lock icon |
| TC10-21 | Prevent circular dependency | Dependency chain exists | Attempt to create dependency that would form a cycle | Error: Would create circular dependency |
| TC10-22 | Remove task dependency | Dependency exists | Click remove on dependency | Dependency removed, task no longer blocked |
| TC10-23 | Burndown bar shows on-track status | Completion rate >= ideal rate | View sprint board | Burndown bar shows green On Track indicator |
| TC10-24 | Burndown bar shows behind status | Completion rate < ideal rate | View sprint board | Burndown bar shows red percentage behind |
| TC10-25 | Burndown Chart page accessible | Sprint exists | Click View Burndown | Full burndown chart page renders |
| TC10-26 | Milestone-linked sprint scopes assignee picker | Sprint linked to milestone with assigned members | Open Add Task modal | Only milestone-assigned members shown in assignee dropdown |


---

### TC11 — Gantt Chart (FR11)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC11-01 | Gantt chart renders with milestones and sprints | Project with milestones and sprints exists | Navigate to Gantt page | Horizontal timeline with milestone and sprint bars rendered |
| TC11-02 | Milestone bars colour-coded by status | Milestones with different statuses exist | View Gantt chart | Completed=green, In Progress=indigo, Upcoming=slate, Blocked=red |
| TC11-03 | Sprint bars colour-coded by status | Sprints with different statuses exist | View Gantt chart | Active=orange, Planned=violet, Completed=green |
| TC11-04 | TODAY marker displayed at correct position | Project is active | View Gantt chart | Vertical indigo line and TODAY badge at current date |
| TC11-05 | Milestone diamond endpoint shown | Milestones exist | View Gantt chart | Diamond marker at end of each milestone bar |
| TC11-06 | Tooltip on milestone bar hover | Milestones exist | Hover over milestone bar | Tooltip shows name, date range, week number |
| TC11-07 | Tooltip on sprint bar hover | Sprints exist | Hover over sprint bar | Tooltip shows name, date range, duration in days |
| TC11-08 | Collapse milestone group | Milestones exist | Click Milestones group toggle | Milestone rows hidden, group shows collapsed state |
| TC11-09 | Expand milestone group | Milestones collapsed | Click Milestones group toggle | Milestone rows shown again |
| TC11-10 | Collapse sprint group | Sprints exist | Click Sprints group toggle | Sprint rows hidden |
| TC11-11 | Colour legend displayed | Chart rendered | View bottom of chart | Legend shows all status colours for milestones and sprints |
| TC11-12 | Empty state when no data | No milestones and no sprints | Navigate to Gantt page | Empty state shown with guidance message |
| TC11-13 | Navigate to Timeline View | Gantt page open | Click Timeline View button | Navigates to roadmap page |
| TC11-14 | Navigate to Sprints | Gantt page open | Click Sprints button | Navigates to sprint planning page |

---

### TC12 — AI Risk Radar (FR12)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC12-01 | Risk Radar detects critical burndown risk | Sprint >35% behind schedule | Open Risk Radar | Critical risk card shown for Sprint Burndown category |
| TC12-02 | Risk Radar detects high burndown risk | Sprint 20-35% behind | Open Risk Radar | High risk card shown for Sprint Burndown |
| TC12-03 | Risk Radar detects medium burndown risk | Sprint 10-20% behind | Open Risk Radar | Medium risk card shown for Sprint Burndown |
| TC12-04 | Risk Radar detects critical overload | Member >120% capacity | Open Risk Radar | Critical risk card shown for Team Overload |
| TC12-05 | Risk Radar detects high overload | Member 100-120% capacity | Open Risk Radar | High risk card shown for Team Overload |
| TC12-06 | Risk Radar detects medium capacity risk | Member 80-100% capacity | Open Risk Radar | Medium risk card shown for Team Capacity |
| TC12-07 | Risk Radar detects group conflict risk | Two members with group_conflict both active on sprint | Open Risk Radar | Risk card shown for Behavioural Conflict |
| TC12-08 | Risk Radar detects blocked milestone | Milestone status=blocked within 3 weeks | Open Risk Radar | High risk card shown for Milestone Risk |
| TC12-09 | Risk Radar detects milestone due this week | Milestone due in current week, not completed | Open Risk Radar | High risk card shown for Milestone Deadline |
| TC12-10 | Risk Radar detects approaching milestone | Milestone due in 2-3 weeks | Open Risk Radar | Medium risk card shown for Milestone Deadline |
| TC12-11 | All Clear state when no risks | All sprints on track, no overloads, no conflicts | Open Risk Radar | All Clear state shown with green indicator |
| TC12-12 | Risk card links to relevant page | Risk card exists | Click View link on risk card | Navigates to the relevant page (sprints, team, project) |
| TC12-13 | Risk counts shown in header | Multiple risks exist | View Risk Radar header | Counts per severity level (Critical, High, Medium) shown |
| TC12-14 | Risks recomputed on page reload | Risk state changes between visits | Reload Risk Radar page | Updated risk list reflects current state |


---

### TC13 — Real-Time Messaging (FR13)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC13-01 | Select General channel | User is workspace member | Click General in sidebar | General channel opens, message history loads |
| TC13-02 | Select project channel | Project exists, user is member | Click project channel in sidebar | Project channel opens, message history loads |
| TC13-03 | Send a text message | Channel selected | Type message and press Enter or click Send | Message appears in feed for sender and all channel members in real time |
| TC13-04 | Send message with @mention | Team members exist | Type @ and select member from autocomplete | Message sent with mention, mentioned member receives notification |
| TC13-05 | Attach file to message | Channel selected | Click attach, select file, send | File uploaded to storage, file attachment shown in message |
| TC13-06 | Reply to a message | Message exists in feed | Click Reply on a message, type reply, send | Reply sent with preview of original message shown |
| TC13-07 | Pin a message | Message exists | Click Pin on message | Message marked as pinned, pin indicator shown, updates in real time for all members |
| TC13-08 | Unpin a message | Message is pinned | Click Unpin on message | Pin removed, updates in real time |
| TC13-09 | Search messages in channel | Messages exist | Type query in search bar | Matching messages highlighted or filtered |
| TC13-10 | Real-time delivery to second user | Two users in same channel | User A sends message | User B sees message appear without page refresh |
| TC13-11 | Connection error banner shown | Network interruption simulated | Disconnect network | Connection error banner appears with Retry Now button |
| TC13-12 | Auto-reconnect after 3 seconds | Connection error occurred | Wait 3 seconds | System automatically reconnects, banner clears |
| TC13-13 | Manual reconnect via Retry Now | Connection error shown | Click Retry Now | System reconnects immediately |
| TC13-14 | Access denied to restricted project channel | User not member of project | Attempt to open project channel | Access-denied state shown |
| TC13-15 | Message history loads on channel switch | Messages exist | Switch between channels | History for selected channel loads correctly |
| TC13-16 | Empty channel shows welcome state | No channel selected | Open Messages page | Welcome state shown with channel type descriptions |

---

### TC14 — Notifications (FR14)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC14-01 | Notification created on task assignment | Member exists, notify_tasks=true | Assign sprint task to member | Notification record created with type=task_assigned |
| TC14-02 | Notification created on sprint close | Member in sprint, notify_sprints=true | Close a sprint | Notification created with type=sprint_closed |
| TC14-03 | Notification created on milestone risk | Member exists, notify_risks=true | Risk event triggered | Notification created with type=milestone_risk |
| TC14-04 | Notification created on @mention | Member exists, notify_mentions=true | Send message with @mention | Notification created with type=mention |
| TC14-05 | Notification skipped when preference disabled | Member has notify_tasks=false | Assign task to member | No notification created for task_assigned |
| TC14-06 | Notification error does not break main flow | DB error on notification insert | Trigger notification creation | Main action completes successfully, error swallowed silently |
| TC14-07 | Notification includes correct link | Notification created | View notification | Link field points to relevant page |

---

### TC15 — My Work — Personal Task Dashboard (FR15)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC15-01 | View all assigned tasks | Member has tasks assigned across projects | Navigate to My Work | All assigned sprint tasks shown, grouped by project |
| TC15-02 | Filter tasks by To Do | Tasks with different statuses exist | Select To Do filter | Only To Do tasks shown |
| TC15-03 | Filter tasks by In Progress | Tasks exist | Select In Progress filter | Only In Progress tasks shown |
| TC15-04 | Filter tasks by Done | Tasks exist | Select Done filter | Only Done tasks shown |
| TC15-05 | Filter tasks — All | Tasks exist | Select All filter | All tasks shown regardless of status |
| TC15-06 | Cycle task status — To Do to In Progress | Task in To Do | Click status icon | Task status changes to In Progress |
| TC15-07 | Cycle task status — In Progress to Done | Task in In Progress | Click status icon | Task status changes to Done, strikethrough applied |
| TC15-08 | Cycle task status — Done back to To Do | Task in Done | Click status icon | Task status cycles back to To Do |
| TC15-09 | Summary counts accurate | Tasks with mixed statuses | View My Work | To Do, In Progress, Done counts match actual task counts |
| TC15-10 | Collapse project group | Project group expanded | Click project header | Tasks hidden, group shows collapsed state |
| TC15-11 | Expand project group | Project group collapsed | Click project header | Tasks shown again |
| TC15-12 | Refresh button reloads tasks | Tasks updated externally | Click Refresh | Latest task list fetched from server |
| TC15-13 | Empty state when no tasks assigned | Member has no assigned tasks | Navigate to My Work | Empty state shown with guidance message |


---

### TC16 — Client View (FR16)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC16-01 | Client redirected to /client-view on login | User has Client role | Log in as client | Redirected to /dashboard/client-view |
| TC16-02 | Non-client redirected away from /client-view | User has Member or PM role | Navigate to /dashboard/client-view | Redirected to /dashboard |
| TC16-03 | Portfolio summary shows correct project count | Projects exist in workspace | View Client View | Total projects, active projects count shown correctly |
| TC16-04 | Milestone completion percentage accurate | Projects with milestones exist | View Client View | Overall milestone completion % calculated correctly |
| TC16-05 | Project portfolio grid renders | Projects exist | View Client View | Each project shown with name, status badge, milestone completion bar |
| TC16-06 | Upcoming milestone timeline grouped by week | Incomplete milestones exist | View Client View | Milestones grouped by week number, max 8 weeks shown |
| TC16-07 | Completed milestones excluded from timeline | Mix of completed and pending milestones | View Client View | Only incomplete milestones shown in timeline |
| TC16-08 | Team headcount shown correctly | Team members exist | View Client View | Correct total member count displayed |
| TC16-09 | Team avatars shown | Members with avatars exist | View Client View | Up to 6 member avatars shown with overflow count |
| TC16-10 | Client cannot access sprint board | Client role | Navigate to /dashboard/projects/[id]/sprints | Access denied or redirect |
| TC16-11 | Client cannot access team management | Client role | Navigate to /dashboard/team | Access denied or redirect |
| TC16-12 | Empty state when no projects | No projects in workspace | View Client View | Empty state shown for project portfolio |

---

### TC17 — Role-Based Access Control (FR17)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC17-01 | Owner can create project | Owner logged in | Attempt to create project | Project creation succeeds |
| TC17-02 | PM can create project | PM logged in | Attempt to create project | Project creation succeeds |
| TC17-03 | Member cannot create project | Member logged in | Attempt to access new project page | Access denied or create button hidden |
| TC17-04 | Owner can create sprint | Owner logged in | Click New Sprint | Sprint creation modal opens |
| TC17-05 | Member cannot create sprint | Member logged in | View sprint page | New Sprint button not shown |
| TC17-06 | Owner can run AI allocation | Owner logged in | Click Run AI Staffer | Allocation runs successfully |
| TC17-07 | Member cannot run AI allocation | Member logged in | View allocation page | Run AI Staffer button not shown |
| TC17-08 | Owner can manage team members | Owner logged in | Open team management | Add, edit, remove controls visible |
| TC17-09 | Member cannot manage team | Member logged in | Open team page | Management controls hidden |
| TC17-10 | Owner can view financial analytics | Owner logged in | Navigate to analytics | Analytics page loads |
| TC17-11 | Member cannot view financial analytics | Member logged in | Navigate to analytics | Access denied or redirect |
| TC17-12 | Only Owner can change member roles | Owner logged in | Open Change Role modal | Role change succeeds |
| TC17-13 | PM cannot change member roles | PM logged in | Attempt to change role | Change Role option not available |
| TC17-14 | Owner can create share links | Owner logged in | Click Generate Share Link | Share link created |
| TC17-15 | Member cannot create share links | Member logged in | View project detail | Generate Share Link button not shown |
| TC17-16 | API returns 403 for unauthorized PM action | Member session | POST /api/sprints/create directly | 403 Forbidden returned |
| TC17-17 | API returns 403 for unauthorized allocation | Member session | POST /api/allocation directly | 403 Forbidden returned |
| TC17-18 | Client role enforced at API level | Client session | POST /api/add-team-member | 403 Forbidden returned |

---

### TC18 — AI Project Intelligence — Insights (FR18)

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| TC18-01 | Ask question about member assignment | Allocation and patterns exist | Type: Why was [member] assigned to [milestone]? | AI returns answer citing skills, capacity, and patterns |
| TC18-02 | Ask question about team performance | Sprint history exists | Type: Who is the best performer this month? | AI returns answer with completion rates and scores |
| TC18-03 | Ask question about conflict avoidance | Group conflict pattern exists | Type: Why were A and B not assigned together? | AI references group_conflict pattern in answer |
| TC18-04 | Ask question about future recommendations | Member data exists | Type: What should [member] focus on next? | AI references current milestones and backlog |
| TC18-05 | Insights with no workspace data | Empty workspace | Submit any question | AI states no data available and suggests what to add |
| TC18-06 | Insights API restricted to authenticated users | No session | POST /api/insights directly | 401 Unauthorized returned |
| TC18-07 | Insights API restricted to valid workspaceId | Authenticated user | POST without workspaceId | 400 Bad Request returned |
| TC18-08 | AI answer is specific and cites data | Rich workspace data exists | Ask specific question | Answer includes member names, dates, numbers, pattern types |
| TC18-09 | Insights page accessible to Owner | Owner logged in | Navigate to Insights | Page loads and question input available |
| TC18-10 | Insights page accessible to PM | PM logged in | Navigate to Insights | Page loads and question input available |


---

## Unit Testing

Unit testing validates individual functions and modules in isolation to ensure each component behaves correctly before integration.

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| UT01 | Validate user login credentials | User account exists | Valid email and password | Login successful, session created |
| UT02 | Validate password length rule | - | Password with 5 characters | Validation fails: minimum 6 characters |
| UT03 | Process project PDF document | Valid PDF uploaded | PDF file | Structured project data extracted or error returned |
| UT04 | Generate AI project structure | Project data available | Trigger AI processing | Output includes milestones, skills, budget, risks |
| UT05 | Assign resources to project tasks | Team members and project exist | Run AI allocation | Tasks assigned based on skills, capacity, and patterns |
| UT06 | Performance score calculation — BLOCKER | Member with no patterns | Add BLOCKER pattern | Score = 100 - 20 = 80 |
| UT07 | Performance score calculation — multiple patterns | Member with existing patterns | Add CAUTION + INFO | Score decremented by 10 + 3 correctly |
| UT08 | Performance score restore on resolve | Pattern exists | Resolve pattern | Score restored by pattern's deduction amount |
| UT09 | Update milestone status | Project with milestones exists | Change milestone status | Updated status saved and reflected in roadmap |
| UT10 | Sprint burndown percentage calculation | Sprint with tasks, some done | View sprint board | Completion % = done_hours / total_hours x 100 |
| UT11 | Ideal burndown percentage calculation | Sprint with known duration | View sprint board | Ideal % = days_elapsed / total_days x 100 |
| UT12 | Financial cost calculation — default hours | Assignment with no time estimate | View analytics | Cost = hourly_rate x 20 |
| UT13 | Financial cost calculation — custom hours | Assignment with time_estimate_hours set | View analytics | Cost = hourly_rate x time_estimate_hours |
| UT14 | AI Readiness completeness score | Profile with partial data | View settings | Score = (filled fields / 6) x 100 |
| UT15 | Circular dependency detection | Task dependency chain exists | Add dep that creates cycle | Cycle detected, dependency rejected |
| UT16 | Share token validation | Token exists | Access /share/[token] | Valid token returns project data, invalid returns error |
| UT17 | Notification preference check | Member with notify_tasks=false | Trigger task_assigned notification | Notification not created |
| UT18 | Generate financial report | Project allocations and costs exist | Request financial summary | Budget, forecast, actual, burn-rate data returned |

---

## Integration Testing

Integration testing validates the interactions between system modules to ensure data flows correctly across components.

| Test Case ID | Integrated Modules | Test Scenario | Input | Expected Output |
|---|---|---|---|---|
| IT01 | PDF Upload → AI Extraction → Project Record | Upload PDF and trigger AI processing | Valid PDF document | Project created with ai_status=completed, all fields populated |
| IT02 | AI Extraction → Blueprint Editor | Use AI-extracted data in blueprint editor | Extracted project data | Blueprint editor pre-populated with AI data, editable |
| IT03 | AI Allocation → Roadmap | Run allocation then view roadmap | Completed allocation | Roadmap displays all assigned tasks on weekly timeline |
| IT04 | AI Allocation → Financial Analytics | Run allocation then view analytics | Allocation with hourly rates | Forecasted cost calculated correctly from assignments |
| IT05 | Sprint Creation → Sprint Board | Create sprint then open board | Sprint with milestone link | Board shows correct columns, AI Populate available |
| IT06 | Sprint Board → My Work | Assign task in sprint board | Task assigned to member | Task appears in member's My Work page |
| IT07 | Worker Patterns → AI Allocation | Record BLOCKER pattern then run allocation | Pattern + allocation trigger | BLOCKER member excluded from restricted task type |
| IT08 | Worker Patterns → Risk Radar | Record group conflict then open Risk Radar | Both members active on sprint | Behavioural conflict risk card shown |
| IT09 | Sprint Tasks → Risk Radar | Create sprint with tasks, fall behind | Sprint burndown gap >10% | Burndown risk card shown on Risk Radar |
| IT10 | Team Capacity → Risk Radar | Assign tasks exceeding member capacity | Member hours > capacity | Team overload risk card shown |
| IT11 | Notifications → Notification Preferences | Assign task to member with preference disabled | notify_tasks=false | No notification created |
| IT12 | Messaging → Supabase Realtime | Send message in channel | Message sent | Second user receives message in real time without refresh |
| IT13 | User Roles → API Permission Control | Access restricted API with unauthorized role | Member session on PM-only route | 403 Forbidden returned |
| IT14 | Onboarding → Workspace Membership | Complete onboarding | Valid workspace name or invite | Workspace membership and team_member record created |
| IT15 | Share Link → Public View | Create share link then access as unauthenticated | Valid token | Read-only project data displayed |
| IT16 | Sprint Close → Notifications | Close sprint with members | Sprint closed | sprint_closed notifications created for sprint members |
| IT17 | Milestone Status → Roadmap Health | Update milestone to completed | All milestones completed | Roadmap health badge shows All Done |

---

## Acceptance Testing

Acceptance testing validates that the system meets end-user requirements and is ready for deployment. Tests are performed from the perspective of each user role.

| Test Case ID | Test Scenario | Pre-Conditions | Input | Expected Output |
|---|---|---|---|---|
| AT01 | Owner creates workspace and invites PM | New user registered | Create workspace, generate PM invite link | Workspace created, PM joins with correct role |
| AT02 | PM uploads project PDF and reviews AI extraction | Workspace exists | Upload valid project PDF | Project created with milestones, budget, risks, skills extracted |
| AT03 | PM edits project blueprint after AI extraction | Project with ai_status=completed | Open Blueprint Editor, modify milestones and risks, save | Changes persisted and reflected on project detail page |
| AT04 | PM adds team members and records behavioural patterns | Workspace exists | Add members, record BLOCKER and group conflict patterns | Members added, patterns saved, performance scores updated |
| AT05 | PM runs AI allocation and reviews assignments | Project and team members exist | Click Run AI Staffer | All milestones assigned with reasoning, patterns respected |
| AT06 | PM creates sprint linked to milestone and populates tasks | Allocation completed | Create sprint, link milestone, click AI Populate | Sprint created, tasks generated in Backlog column |
| AT07 | Member views My Work and updates task status | Tasks assigned to member | Navigate to My Work, cycle task status | Task status updated, summary counts refresh |
| AT08 | PM views Live Roadmap and monitors progress | Allocation and sprints exist | Open roadmap, toggle task completion | Task toggled, activity feed updated, health badge refreshes |
| AT09 | PM views Financial Analytics and edits budget | Allocation with hourly rates exists | Open analytics, review costs, edit budget | Costs displayed correctly, budget edit saved |
| AT10 | PM views AI Risk Radar and acts on risks | Active sprints with issues exist | Open Risk Radar | Risks shown by severity with links to remediation pages |
| AT11 | Team members communicate via messaging | Workspace with members exists | Send messages in General and project channels | Messages delivered in real time to all channel members |
| AT12 | PM uses AI Insights to query team performance | Sprint history and patterns exist | Ask natural-language question about team | AI returns specific, data-backed answer |
| AT13 | Client logs in and views project portfolio | Client user exists, projects exist | Log in as client | Redirected to Client View, read-only portfolio shown |
| AT14 | Member role cannot access PM features | Member user exists | Attempt to create project, run allocation, manage team | All PM-only features blocked, 403 returned on API calls |
| AT15 | PM views Gantt Chart for project timeline | Project with milestones and sprints exists | Navigate to Gantt page | Timeline renders with colour-coded bars, today marker, tooltips |
| AT16 | PM generates and shares project link with client | Project exists | Generate share link, open in incognito | Read-only project view accessible without login |
| AT17 | Notification preferences respected end-to-end | Member with preferences configured | Disable task notifications, assign task to member | No notification created for that member |
| AT18 | Sprint soft-delete and restore | Sprint exists | Delete sprint, open trash, restore within 30 days | Sprint restored to planning status |

