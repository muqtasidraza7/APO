# APO — Missing Activity Diagrams
# Paste each block into https://www.plantuml.com/plantuml/uml/

---

## FR04 — Team Management Activity Diagram

```plantuml
@startuml AD_FR04_TeamManagement
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Team Management (FR04)

start

:PM opens Team Dashboard;
:System loads all workspace members\nwith utilization, tasks, and performance score;

fork
  :PM views Capacity Gauge\n(workspace-wide utilization metrics);
fork again
  :PM applies member filter\n(All / Overloaded / Available / Online);
  :System filters and displays\nmatching members;
end fork

:PM selects an action;

switch (Action?)
case (Add Member)
  :PM clicks Add Member;
  :PM fills in name, email, job title,\nskills, capacity, hourly rate;
  if (All required fields filled?) then (yes)
    :System inserts team_member record;
    :Member appears in team roster;
  else (no)
    :Show validation error;
  endif

case (Invite via Link)
  :PM clicks Copy Invite Link;
  :System generates invite URL\nwith workspace_id and optional role=pm;
  :Link copied to clipboard;

case (Edit Member)
  :PM opens Edit Member modal;
  :PM modifies profile fields;
  :System updates team_member record;
  :Changes reflected on member card;

case (Change Role)
  :Owner opens Change Role modal;
  :Owner selects new role;
  :System updates workspace_members.role;
  :Role badge updates on card;

case (Remove Member)
  :PM clicks Remove Member;
  :System prompts: type member full name;
  if (Name matches?) then (yes)
    :System soft-deletes team_member;
    :System sets assigned_to = NULL\nfor all member's tasks;
    :Member removed from roster;
  else (no)
    :Removal blocked;
    :Show error message;
  endif

case (View Edit History)
  :PM opens edit history panel;
  :System displays timestamped\nlist of changes;
endswitch

stop
@enduml
```

---

## FR05 — AI-Powered Resource Allocation Activity Diagram

```plantuml
@startuml AD_FR05_AIAllocation
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — AI-Powered Resource Allocation (FR05)

start

:PM opens Allocation page;
:System checks project has\ncompleted AI analysis;

if (ai_status = completed?) then (yes)
  :PM clicks Run AI Staffer;
  :System fetches project milestones\nand required skills;
  :System fetches all team members\n(skills, capacity, performance_score);
  :System fetches worker_patterns\n(blockers, conflicts, cautions);

  :AI Engine processes data;

  fork
    :Check BLOCKER patterns\nfor each member-task pair;
  fork again
    :Check GROUP CONFLICT patterns\nbetween member pairs;
  fork again
    :Check skill match\nfor each milestone;
  fork again
    :Check weekly capacity\nfor each member;
  end fork

  :AI generates assignments\n(1-5 members per milestone);

  loop For each milestone
    if (Member has BLOCKER for this task?) then (yes)
      :Exclude member from assignment;
    else (no)
      if (Member has CAUTION for this task?) then (yes)
        :Assign member with\nCAUTION warning in reasoning;
      else (no)
        :Assign member normally;
      endif
    endif
    if (Two members have GROUP CONFLICT?) then (yes)
      :Exclude one conflicting member;
    endif
  end loop

  :System saves assignments\nto project_assignments table;
  :System updates milestone\nassigned_member_ids;
  :Display assignments with\nweek, task, resource, reasoning;

  :PM reviews assignments;

  switch (PM action?)
  case (Re-run)
    :Delete previous assignments;
    :Repeat AI allocation process;
  case (Use Assignment Explainer)
    :PM types natural-language question;
    :AI returns explanation citing\nskills, patterns, capacity;
  case (Save Scenario)
    :System saves current allocation\nas named scenario;
  case (Apply Scenario)
    :System sets selected scenario\nas active allocation;
  case (Accept)
    :Allocation confirmed;
  endswitch

else (no)
  :Show error:\nProject AI analysis not complete;
endif

stop
@enduml
```

---

## FR06 — Worker Behavioural Pattern System Activity Diagram

```plantuml
@startuml AD_FR06_BehaviouralPatterns
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Worker Behavioural Pattern System (FR06)

start

:PM opens Team page;
:PM selects a team member or member pair;

switch (Pattern action?)

case (Record Task Incompatibility)
  :PM selects member;
  :PM enters task type, reason,\nand severity (INFO / CAUTION / BLOCKER);
  :System saves pattern record;
  fork
    :Fetch all active patterns for member;
  fork again
    :Calculate score deduction:\nBLOCKER=-20, CAUTION=-10, INFO=-3;
  end fork
  :System updates performance_score\n= 100 - total deductions;
  :Pattern badge appears on member card;

case (Record Group Conflict)
  :PM selects two different members;
  if (Same member selected twice?) then (yes)
    :Show error:\nMust select two different members;
    stop
  else (no)
    :PM enters reason and severity;
    :System saves group_conflict pattern;
    :Performance scores updated\nfor both members;
    :Conflict badge shown on both cards;
  endif

case (Record Positive Collaboration)
  :PM selects two members;
  :PM enters reason;
  :System saves collaboration_positive pattern;
  :AI will prefer pairing these members\nin future allocations;

case (Resolve Pattern)
  :PM clicks Resolve on existing pattern;
  :System marks pattern as resolved=true;
  :System recalculates performance score\n(removes this pattern's deduction);
  :Badge removed from member card;
  :Score restored on member card;

endswitch

:System reflects updated score\nand badges across all views;

stop
@enduml
```

---

## FR07 — Live Roadmap Activity Diagram

```plantuml
@startuml AD_FR07_LiveRoadmap
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Live Roadmap (FR07)

start

:User navigates to Roadmap page\n(from project detail or allocation page);

if (Assignments exist?) then (yes)
  :System calculates current week\nbased on project start date;
  :System renders weekly timeline grid;

  fork
    :Highlight current week as TODAY;
  fork again
    :Dim past week columns;
  fork again
    :Display future weeks normally;
  end fork

  :System calculates health status;

  if (All tasks completed?) then (yes)
    :Show health badge: All Done;
  else if (Overdue tasks exist?) then (yes)
    :Show health badge: Delayed;
  else (no)
    :Show health badge: On Track;
  endif

  :Display progress bar and stats\n(% complete, done, overdue, remaining);
  :Display Activity Feed\n(timestamped events);

  :User interacts with roadmap;

  switch (User action?)
  case (Toggle task completion)
    :User clicks task row;
    if (Task currently open?) then (yes)
      :Mark task as completed;
      :Log task_completed in team_activity;
    else (no)
      :Mark task as reopened;
      :Log task_reopened in team_activity;
    endif
    :Recalculate progress stats;
    :Update health badge;
    :Refresh activity feed;

  case (Simulate Next Week)
    :PM clicks Simulate Next Week;
    :System advances project simulation\nby one week;
    :Milestone statuses updated;
    :Activity log updated;
    :Timeline grid refreshes;
  endswitch

else (no)
  :Show empty state:\nRun resource allocation first;
endif

stop
@enduml
```

---

## FR08 — Financial Analytics Activity Diagram

```plantuml
@startuml AD_FR08_FinancialAnalytics
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Financial Analytics (FR08)

start

:PM opens Financial Analytics page;
:System fetches project data\n(budget, ai_data, assignments);
:System fetches team members\n(hourly_rate, capacity);
:System fetches sprint tasks\n(status, time_estimate_hours);

if (Assignments exist?) then (yes)

  :Calculate forecasted total cost;
  note right
    For each assignment:
    cost = hourly_rate x est_hours
    (default 20h if not specified)
  end note

  :Calculate actual spent cost;
  note right
    Only completed tasks included
  end note

  :Calculate weekly burn-rate\nper project week;

  :Calculate per-member\ncost and hours breakdown;

  if (Forecasted cost > Budget?) then (yes)
    :Display over-budget warning;
  else (no)
    :Display within-budget status;
  endif

  :Render weekly burn-rate bar chart;
  :Render per-member cost breakdown table;
  :Render velocity chart\n(sprint completion rates);

  :PM reviews analytics;

  if (PM edits budget?) then (yes)
    :PM clicks edit on budget field;
    :PM enters new budget value;
    :PM clicks Save;
    :System updates ai_data.budget_estimate;
    :Analytics recalculate with new budget;
  else (no)
    :Analytics displayed as-is;
  endif

else (no)
  :Show zero costs state;
  :No resource breakdown displayed;
endif

stop
@enduml
```

---

## FR09 — Settings & Profile Activity Diagram

```plantuml
@startuml AD_FR09_SettingsProfile
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Settings & Profile (FR09)

start

:User opens Settings page;
:System loads profile data\n(team_member record + sprint stats);
:Display AI Readiness score\nand Performance Gauge;

:User selects a tab;

switch (Active tab?)

case (AI Profile)
  :User views current profile\n(name, title, skills, experience, capacity);

  if (User uploads CV PDF?) then (yes)
    if (File is PDF and <= 10MB?) then (yes)
      :Send to /api/parse-cv;
      :AI extracts skills, title,\nexperience level, years;
      :Auto-fill profile fields;
      :User reviews extracted data;
    else (no)
      :Show error:\nPDF only, max 10MB;
    endif
  endif

  :User edits fields manually\n(name, title, experience, capacity);
  :User manages skill stack\n(add / remove skills);

  :User clicks Save;
  :System validates fields;
  if (Valid?) then (yes)
    :Update team_member record in DB;
    :Recalculate AI Readiness score;
    :Show confirmation message;
  else (no)
    :Show validation error;
  endif

case (Security)
  :User enters new password\nand confirmation;
  if (Passwords match and >= 6 chars?) then (yes)
    :System calls Supabase Auth\nupdateUser({ password });
    :Show success message;
  else (no)
    :Show error message;
  endif

case (Preferences)
  :User views notification toggles\n(tasks, sprints, risks, mentions);
  :User toggles preferences on/off;
  :System saves preferences\nto team_member record;
  :Show confirmation;

endswitch

stop
@enduml
```

---

## FR11 — Gantt Chart Activity Diagram

```plantuml
@startuml AD_FR11_GanttChart
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Gantt Chart (FR11)

start

:User navigates to Gantt Chart page;
:System fetches project data\n(milestones, start date, total weeks);
:System fetches all sprints\n(name, start_date, end_date, status);

if (Milestones or sprints exist?) then (yes)

  :Calculate timeline bounds;
  note right
    Snap to Monday of project start week
    Extend to last sprint end + 10 day buffer
  end note

  :Build week and month markers;
  :Calculate TODAY position on timeline;

  fork
    :Build milestone rows\n(colour by status:\ncompleted/live/upcoming/blocked);
  fork again
    :Build sprint rows\n(colour by status:\nactive/planning/completed);
  end fork

  :Render timeline header\n(week/month markers, TODAY badge);
  :Render chart body\n(milestone bars with diamond endpoints,\nsprint bars with background fill);
  :Render colour legend;

  :User interacts with chart;

  switch (User action?)
  case (Hover over bar)
    :Show tooltip\n(name, date range, duration);
  case (Collapse Milestones group)
    :Hide milestone rows;
    :Show collapsed state in sidebar;
  case (Expand Milestones group)
    :Show milestone rows;
  case (Collapse Sprints group)
    :Hide sprint rows;
  case (Expand Sprints group)
    :Show sprint rows;
  case (Navigate to Timeline View)
    :Redirect to roadmap page;
  case (Navigate to Sprints)
    :Redirect to sprint planning page;
  endswitch

else (no)
  :Show empty state:\nRun AI analysis and create sprints first;
endif

stop
@enduml
```

---

## FR12 — AI Risk Radar Activity Diagram

```plantuml
@startuml AD_FR12_RiskRadar
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — AI Risk Radar (FR12)

start

:PM opens Risk Radar page;
:System fetches active sprints + tasks;
:System fetches team members + capacity;
:System fetches unresolved worker_patterns;
:System fetches project milestones;

:Risk Engine computes risks;

fork
  :Compute Sprint Burndown Risks;
  note right
    For each active sprint:
    gap = time_elapsed% - completion%
    gap > 35% → Critical
    gap > 20% → High
    gap > 10% → Medium
  end note

fork again
  :Compute Team Overload Risks;
  note right
    For each member:
    ratio = assigned_hours / capacity
    ratio > 120% → Critical
    ratio > 100% → High
    ratio > 80% → Medium
  end note

fork again
  :Compute Behavioural Conflict Risks;
  note right
    For each group_conflict pattern:
    if both members active on sprint
    → High or Medium risk
  end note

fork again
  :Compute Milestone Deadline Risks;
  note right
    For milestones due within 3 weeks:
    status=blocked → High
    due this/next week → High
    due in 2-3 weeks → Medium
  end note

end fork

:Sort all risks by severity\n(Critical → High → Medium);

if (Risks found?) then (yes)
  :Display risk header with\nlive detection indicator;
  :Display severity counts\n(Critical, High, Medium);
  :Render risk cards grouped by severity;
  :Each card shows: category, title,\ndescription, detail chips, View link;

  :PM reviews risks;

  if (PM clicks View link?) then (yes)
    :Navigate to relevant page\n(sprints / team / project);
  endif

else (no)
  :Display All Clear state\nwith green indicator;
endif

:Risks recomputed on every page load;

stop
@enduml
```

---

## FR14 — Notifications Activity Diagram

```plantuml
@startuml AD_FR14_Notifications
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Notifications (FR14)

start

:Triggering event occurs in system;
note right
  Events:
  - task_assigned
  - sprint_closed
  - milestone_risk
  - mention
  - dependency_unblocked
end note

:System calls createNotification()\nwith userId, type, title, body, link;

:Determine preference column\nfor this event type;
note right
  task_assigned → notify_tasks
  sprint_closed → notify_sprints
  milestone_risk → notify_risks
  mention → notify_mentions
  dependency_unblocked → notify_tasks
end note

:Fetch user's notification preference\nfrom team_members table;

if (Preference explicitly set to false?) then (yes)
  :Skip notification creation;
  :Return silently;
else (no)
  :INSERT notification record\n(user_id, type, title, body, link);

  if (DB insert succeeds?) then (yes)
    :Notification stored successfully;
    :Notification appears in user's feed;
  else (no)
    :Error caught silently;
    :Main application flow continues\nuninterrupted;
  endif
endif

:User views notification feed;
:User reads or dismisses notification;

stop
@enduml
```

---

## FR15 — My Work Activity Diagram

```plantuml
@startuml AD_FR15_MyWork
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — My Work / Personal Task Dashboard (FR15)

start

:Member navigates to My Work page;
:System fetches team_member record\nfor logged-in user;

if (team_member record found?) then (yes)
  :Fetch all sprint_tasks\nassigned to this member\nacross all workspace projects;

  if (Tasks found?) then (yes)
    :Fetch sprint names for task sprint_ids;
    :Fetch project names for task project_ids;
    :Enrich tasks with sprint and project names;
    :Group tasks by project;
    :Calculate summary counts\n(To Do, In Progress, Done);
    :Display task list with filter tabs;

    :Member selects filter;

    switch (Filter selected?)
    case (All)
      :Show all tasks;
    case (To Do)
      :Show only To Do tasks;
    case (In Progress)
      :Show only In Progress tasks;
    case (Done)
      :Show only Done tasks;
    endswitch

    :Member interacts with tasks;

    switch (Member action?)
    case (Click status icon)
      :Determine next status:\ntodo → in_progress → done → todo;
      :Optimistic UI update;
      :UPDATE sprint_tasks SET status = nextStatus;
      if (DB update succeeds?) then (yes)
        :Status badge updates;
        :Summary counts refresh;
      else (no)
        :Revert optimistic update;
        :Show error;
      endif

    case (Collapse project group)
      :Hide tasks for that project;

    case (Expand project group)
      :Show tasks for that project;

    case (Click Refresh)
      :Re-fetch all assigned tasks\nfrom server;
      :Update task list;
    endswitch

  else (no)
    :Show empty state:\nNo tasks assigned yet;
  endif

else (no)
  :Show empty state:\nNot linked to a team member;
endif

stop
@enduml
```

---

## FR16 — Client View Activity Diagram

```plantuml
@startuml AD_FR16_ClientView
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Client View (FR16)

start

:User logs in;
:System resolves user role;

if (Role = client?) then (yes)
  :Redirect to /dashboard/client-view;

  :System fetches workspace data in parallel;

  fork
    :Fetch all workspace projects\n(id, name, status, ai_data, created_at);
  fork again
    :Fetch team members\n(id, full_name, avatar_url) LIMIT 8;
  fork again
    :COUNT total team members;
  end fork

  :Aggregate milestones across all projects;
  :Calculate overall milestone completion %;
  :Calculate active project count;

  :Render portfolio summary section\n(total projects, active, milestone %, headcount);

  :Render project portfolio grid;
  note right
    Each card shows:
    - Project name
    - Status badge
    - Milestone completion bar
    - Created date
  end note

  if (Incomplete milestones exist?) then (yes)
    :Group upcoming milestones by week\n(max 8 weeks, 20 milestones);
    :Render upcoming milestone timeline;
  endif

  :Render team section\n(avatars + total headcount);

  :Client views read-only data;
  note right
    No edit controls shown
    No sprint/team/allocation access
  end note

else (no)
  :Redirect to /dashboard;
endif

stop
@enduml
```

---

## FR17 — Role-Based Access Control Activity Diagram

```plantuml
@startuml AD_FR17_RBAC
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — Role-Based Access Control (FR17)

start

:User makes a request\n(page navigation or API call);

:System extracts user.id\nfrom session cookie via Supabase Auth;

if (Session valid?) then (yes)

  :Query workspaces table\nfor owner_id;

  if (user.id = owner_id?) then (yes)
    :Assign role = owner;
  else (no)
    :Query workspace_members\nfor user role;

    switch (Role in DB?)
    case (pm)
      :Assign role = pm;
    case (client)
      :Assign role = client;
    case (member or null)
      :Assign role = member;
    endswitch
  endif

  :Evaluate required permission\nfor requested action;

  switch (Required permission?)
  case (canManageProject)
    if (role = owner or pm?) then (yes)
      :Allow action;
    else (no)
      :Return 403 / hide UI control;
    endif

  case (canManageTeam)
    if (role = owner or pm?) then (yes)
      :Allow action;
    else (no)
      :Return 403 / hide UI control;
    endif

  case (canViewAnalytics)
    if (role = owner or pm?) then (yes)
      :Allow action;
    else (no)
      :Return 403 / redirect;
    endif

  case (canCreateSprint)
    if (role = owner or pm?) then (yes)
      :Allow action;
    else (no)
      :Return 403 / hide button;
    endif

  case (clientOnly)
    if (role = client?) then (yes)
      :Redirect to /client-view;
    else (no)
      :Allow access to main dashboard;
    endif

  case (memberAccess)
    :Allow view and task update actions;
    :Block create/delete/manage actions;
  endswitch

else (no)
  :Redirect to /login;
endif

stop
@enduml
```

---

## FR18 — AI Project Intelligence (Insights) Activity Diagram

```plantuml
@startuml AD_FR18_Insights
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF

title Activity Diagram — AI Project Intelligence / Insights (FR18)

start

:PM opens Insights page;
:System verifies user is Owner or PM;

if (Authorized?) then (yes)

  :PM types a natural-language question;
  :PM submits question;

  :System validates request\n(question and workspaceId required);

  if (Valid request?) then (yes)

    :Fetch workspace data in parallel;

    fork
      :Fetch team members\n(skills, capacity, performance_score);
    fork again
      :Fetch worker_patterns (last 60);
    fork again
      :Fetch sprints (last 20)\nwith retrospective notes;
    fork again
      :Fetch projects + milestones;
    fork again
      :Fetch team_activity (last 40 events);
    fork again
      :Fetch sprint_tasks\n(completed sprints only);
    end fork

    :Build enriched member context;
    note right
      Per member:
      - Sprint completion rate
      - Current milestone assignments
      - Performance score
    end note

    :Build enriched pattern context;
    note right
      Per pattern:
      - Type, reason, severity
      - Member names resolved
      - Project name resolved
    end note

    :Build sprint history context;
    :Build project milestone context;
    :Build recent activity context;

    :Construct PromptTemplate\nwith question + all context;
    :Send prompt to AI (Groq LLM);

    if (AI responds successfully?) then (yes)
      :Return AI-generated answer;
      :Display answer in chat interface;
    else (no)
      :Show error: AI service unavailable;
    endif

  else (no)
    :Return 400 Bad Request;
  endif

else (no)
  :Return 401 Unauthorized;
endif

stop
@enduml
```
