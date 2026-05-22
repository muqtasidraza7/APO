# APO — Missing Diagrams
# Paste each block individually into https://www.plantuml.com/plantuml/uml/

---

## 1. Activity Diagram — FR05: AI-Powered Resource Allocation

```plantuml
@startuml AD_FR05_AIAllocation
skinparam ActivityBackgroundColor #EEF2FF
skinparam ActivityBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ActivityDiamondBackgroundColor #E0E7FF
skinparam NoteBackgroundColor #F0F4FF
skinparam NoteBorderColor #6366F1

title Activity Diagram — AI-Powered Resource Allocation (FR05)

start

:PM opens Allocation page;
:System verifies user is Owner or PM;

if (Authorized?) then (yes)

  :System fetches project milestones\nfrom ai_data JSONB column;

  if (Milestones exist?) then (yes)

    :Fetch all workspace team members\n(id, full_name, job_title, skills,\ncapacity_hours_per_week, performance_score);

    :Fetch all unresolved worker_patterns\n(task_incompatibility, group_conflict,\ncollaboration_positive, performance_insight);

    :Fetch sprint_tasks history\nfor completion rate calculation;

    :Fetch all project milestones\nacross workspace for milestone\ncompletion rate calculation;

    :Compute per-member sprint\ncompletion rate\n(done / assigned tasks);

    :Compute per-member milestone\ncompletion rate\n(completed / total milestones);

    :Separate patterns by type:;
    note right
      taskPatterns → task_incompatibility
      groupPatterns → group_conflict
      collabPatterns → collaboration_positive
      perfPatterns → performance_insight
    end note

    :Build enriched team JSON\n(skills, capacity, performance_score,\nsprint_completion_rate,\nmilestone_completion_rate);

    :Construct LangChain PromptTemplate\nwith milestones + team + patterns;

    :Invoke Groq API\n(llama-3.3-70b-versatile, temp=0.2)\nwith structured output schema\n(taskAssignmentsArraySchema);

    :AI performs semantic matching:;
    note right
      Priority order:
      1. Skill match
      2. Sprint completion rate
      3. Milestone completion rate
      4. Performance score
      5. Pattern memory
      6. Fair distribution
    end note

    fork
      :Check BLOCKER task_incompatibility\n→ exclude member from task type;
    fork again
      :Check BLOCKER group_conflict\n→ never co-assign conflicting pair;
    fork again
      :Check CAUTION patterns\n→ assign with warning in reasoning;
    fork again
      :Check collaboration_positive\n→ prefer proven pairs together;
    end fork

    :AI returns structured assignments:;
    note right
      Per milestone:
      - task_title
      - assigned_to: UUID[]  (1-5 members)
      - assigned_to_names: String[]
      - reasoning: String
      - pattern_warning: String | null
    end note

    :Validate returned UUIDs\nagainst actual team member IDs;

    if (Valid assignments exist?) then (yes)
      :Display assignments on Allocation page\n(week, task, resource, capacity, reasoning);

      :PM reviews assignments;

      switch (PM action?)
      case (Accept)
        :Save to project_assignments table;
        :Update milestone assigned_member_ids\nin ai_data JSONB;

      case (Re-run AI Staffer)
        :Delete previous assignments;
        :Repeat allocation process\nfrom prompt construction;

      case (Assignment Explainer)
        :PM types natural-language question;
        :Fetch patterns + team + activity;
        :Invoke Groq API\n(explain-assignment route);
        :Display AI explanation\nciting patterns, dates, reasons;

      case (Save Scenario)
        :INSERT into allocation_scenarios\n(name, assignments, note);
        :Scenario available for comparison;

      case (Apply Scenario)
        :Replace active assignments\nwith selected scenario;
      endswitch

    else (no)
      :Show error:\nAI could not match any milestones;
    endif

  else (no)
    :Show error:\nNo milestones found.\nRe-run AI analysis first;
  endif

else (no)
  :Return 403 Forbidden;
endif

stop
@enduml
```

---

## 2. Class Diagram — AI Engine (Core Intelligence)

```plantuml
@startuml CD_AIEngine
skinparam ClassBackgroundColor #EEF2FF
skinparam ClassBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ClassHeaderBackgroundColor #6366F1
skinparam ClassHeaderFontColor #FFFFFF
skinparam NoteBackgroundColor #F0F4FF
skinparam NoteBorderColor #6366F1

title Class Diagram — AI Engine (Core Intelligence)

package "AI Utility Layer" {
  class GroqModelFactory {
    +getGroqModel(temperature: Float, model: String): ChatGroq
    --
    model: "llama-3.3-70b-versatile"
    apiKey: process.env.GROQ_API_KEY
  }

  class ChatGroq {
    +apiKey: String
    +model: String
    +temperature: Float
    +invoke(messages): AIMessage
    +withStructuredOutput(schema: ZodSchema): StructuredModel
    +pipe(parser): Chain
  }
}

package "Schema Definitions (Zod)" {
  class ProjectDocumentSchema {
    +summary: String
    +project_type: Enum
    +budget_estimate: Float | null
    +currency: String | null
    +timeline_weeks: Int | null
    +start_date: String | null
    +end_date: String | null
    +client_info: ClientInfoSchema
    +requirements: String[] (max 8)
    +milestones: MilestoneSchema[] (max 8)
    +risks: RiskSchema[] (max 6)
    +required_skills: String[] (max 10)
    +success_criteria: String[] (max 6)
    +constraints: String[] (max 5)
    +assumptions: String[] (max 5)
  }

  class MilestoneSchema {
    +title: String
    +week: Int
    +deliverable: String
    +success_criteria: String | null
  }

  class RiskSchema {
    +description: String
    +severity: Enum(high|medium|low)
    +mitigation: String
  }

  class TaskAssignmentSchema {
    +task_title: String
    +assigned_to: UUID[] (1-5)
    +assigned_to_names: String[]
    +reasoning: String
    +pattern_warning: String | null
  }

  class CVSchema {
    +skills: String[]
    +job_title: String
    +experience_level: Enum
    +years_of_experience: Int
    +summary: String
  }

  class AISprintTaskSchema {
    +title: String
    +description: String
    +effort_level: Enum(low|medium|high)
    +time_estimate_hours: Int
    +priority: Enum(high|medium|low)
    +task_sequence: Int
    +assigned_member_id: UUID
  }

  class SmartAllocationSchema {
    +task_name: String
    +week_number: Int
    +worker_ids: UUID[] (1-5)
    +reasoning: String
    +dependency_risk_warning: String?
  }
}

package "AI API Routes" {
  class ProcessDocumentRoute {
    +POST(request): NextResponse
    --
    -extractJson(text: String): String
    -loadPDF(url: String): String
    -retryOnRateLimit(maxRetries: Int): void
    --
    Uses: GroqModelFactory (temp=0.1)
    Schema: ProjectDocumentSchema
    Stores: projects.ai_data (JSONB)
    Updates: ai_status → completed | failed
  }

  class AssignTasksRoute {
    +POST(request): NextResponse
    --
    -computeSprintStats(tasks): Record
    -computeMilestoneStats(projects): Record
    -buildEnrichedTeamJSON(): String
    -separatePatternsByType(): Object
    --
    Uses: GroqModelFactory (temp=0.2)
    Schema: taskAssignmentsArraySchema
    Stores: project_assignments
    Updates: milestone.assigned_member_ids
  }

  class ParseCVRoute {
    +POST(request): NextResponse
    --
    Uses: GroqModelFactory (temp=0.1)
    Schema: CVSchema
    Input: PDF FormData (max 20000 chars)
    Returns: skills, job_title, experience
  }

  class AISprintPopulateRoute {
    +POST(request): NextResponse
    --
    -inferPhaseFromSprintName(name, count): Phase
    -filterToMilestoneTeam(): TeamMember[]
    -buildPatternsText(): String
    --
    Uses: GroqModelFactory (temp=0.4)
    Schema: AISprintTasksSchema
    Stores: sprint_tasks (created_by_ai=true)
    Phase: Foundation | Core Dev | Integration
  }

  class InsightsRoute {
    +POST(request): NextResponse
    --
    Uses: GroqModelFactory (temp=0.35)
    Parser: StringOutputParser
    Context: members + patterns + sprints\n+ projects + activity
    Returns: Natural language answer
  }

  class ExplainAssignmentRoute {
    +POST(request): NextResponse
    --
    Uses: GroqModelFactory (temp=0.3)
    Parser: StringOutputParser
    Context: patterns + members + activity
    Returns: Assignment explanation
  }

  class ElaborateRoute {
    +POST(request): NextResponse
    --
    Uses: GroqModelFactory (temp=0.4)
    Parser: StringOutputParser
    Returns: 4-5 sentence elaboration
  }
}

package "LangChain Orchestration" {
  class PromptTemplate {
    +fromTemplate(template: String): PromptTemplate
    +invoke(variables: Object): FormattedPrompt
  }

  class StringOutputParser {
    +parse(output: AIMessage): String
  }

  class PDFLoader {
    +load(): Document[]
    --
    parsedItemSeparator: " "
    Source: Blob | File
  }
}

GroqModelFactory --> ChatGroq : creates
ProcessDocumentRoute --> GroqModelFactory : uses
ProcessDocumentRoute --> PDFLoader : uses
ProcessDocumentRoute --> ProjectDocumentSchema : validates with
AssignTasksRoute --> GroqModelFactory : uses
AssignTasksRoute --> TaskAssignmentSchema : validates with
ParseCVRoute --> GroqModelFactory : uses
ParseCVRoute --> CVSchema : validates with
ParseCVRoute --> PDFLoader : uses
AISprintPopulateRoute --> GroqModelFactory : uses
AISprintPopulateRoute --> AISprintTaskSchema : validates with
InsightsRoute --> GroqModelFactory : uses
InsightsRoute --> PromptTemplate : uses
InsightsRoute --> StringOutputParser : uses
ExplainAssignmentRoute --> GroqModelFactory : uses
ExplainAssignmentRoute --> PromptTemplate : uses
ElaborateRoute --> GroqModelFactory : uses
ElaborateRoute --> PromptTemplate : uses
ProjectDocumentSchema --> MilestoneSchema : contains
ProjectDocumentSchema --> RiskSchema : contains
@enduml
```

---

## 3. Database Diagram — Full Database Schema

```plantuml
@startuml DB_FullSchema
skinparam ClassBackgroundColor #EEF2FF
skinparam ClassBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam ClassHeaderBackgroundColor #6366F1
skinparam ClassHeaderFontColor #FFFFFF

title Database Diagram — APO Full Schema

entity "workspaces" as ws {
  * id : UUID <<PK>>
  --
  * name : TEXT
  * owner_id : UUID <<FK→auth.users>>
  * created_at : TIMESTAMPTZ
}

entity "workspace_members" as wm {
  * id : UUID <<PK>>
  --
  * workspace_id : UUID <<FK→workspaces>>
  * user_id : UUID <<FK→auth.users>>
  * role : TEXT (owner|pm|member|client)
  * created_at : TIMESTAMPTZ
}

entity "team_members" as tm {
  * id : UUID <<PK>>
  --
  * workspace_id : UUID <<FK→workspaces>>
  * user_id : UUID <<FK→auth.users>>
  * full_name : TEXT
  * job_title : TEXT
  * skills : TEXT[]
  * experience_level : TEXT
  * years_of_experience : INT
  * capacity_hours_per_week : INT
  * hourly_rate : DECIMAL
  * performance_score : INT (default 100)
  * notify_tasks : BOOLEAN
  * notify_sprints : BOOLEAN
  * notify_risks : BOOLEAN
  * notify_mentions : BOOLEAN
  * avatar_url : TEXT
  * deleted_at : TIMESTAMPTZ
  * created_at : TIMESTAMPTZ
}

entity "projects" as proj {
  * id : UUID <<PK>>
  --
  * workspace_id : UUID <<FK→workspaces>>
  * name : TEXT
  * ai_status : TEXT (parsing|completed|failed)
  * ai_data : JSONB
  note: milestones[], risks[], required_skills[],\nbudget_estimate, timeline_weeks,\nstart_date, end_date, summary
  * project_type : TEXT
  * client_info : JSONB
  * success_criteria : JSONB
  * custom_fields : JSONB
  * original_file_url : TEXT
  * deleted_at : TIMESTAMPTZ
  * created_at : TIMESTAMPTZ
}

entity "project_assignments" as pa {
  * id : UUID <<PK>>
  --
  * project_id : UUID <<FK→projects>>
  * workspace_id : UUID <<FK→workspaces>>
  * task_name : TEXT
  * resource_id : UUID <<FK→team_members>>
  * week_number : INT
  * status : TEXT
  * match_reason : TEXT
  * created_at : TIMESTAMPTZ
}

entity "allocation_scenarios" as as_ {
  * id : UUID <<PK>>
  --
  * project_id : UUID <<FK→projects>>
  * name : TEXT
  * source : TEXT
  * note : TEXT
  * created_by_name : TEXT
  * assignments : JSONB
  * created_at : TIMESTAMPTZ
}

entity "allocation_history" as ah {
  * id : UUID <<PK>>
  --
  * project_id : UUID <<FK→projects>>
  * action : TEXT
  * note : TEXT
  * performed_by_name : TEXT
  * assignment_count : INT
  * assignments_before : JSONB
  * assignments_after : JSONB
  * created_at : TIMESTAMPTZ
}

entity "sprints" as sp {
  * id : UUID <<PK>>
  --
  * project_id : UUID <<FK→projects>>
  * workspace_id : UUID <<FK→workspaces>>
  * name : TEXT
  * goal : TEXT
  * status : TEXT (planning|active|completed)
  * start_date : DATE
  * end_date : DATE
  * milestone_ids : TEXT[]
  * retrospective_notes : TEXT
  * deleted_at : TIMESTAMPTZ
  * created_at : TIMESTAMPTZ
}

entity "sprint_tasks" as st {
  * id : UUID <<PK>>
  --
  * sprint_id : UUID <<FK→sprints>>
  * project_id : UUID <<FK→projects>>
  * workspace_id : UUID <<FK→workspaces>>
  * title : TEXT
  * description : TEXT
  * status : TEXT (backlog|in_progress|in_review|done)
  * priority : TEXT (high|medium|low)
  * effort_level : TEXT (low|medium|high)
  * time_estimate_hours : DECIMAL
  * actual_hours : DECIMAL
  * assigned_to : UUID <<FK→team_members>>
  * created_by_ai : BOOLEAN
  * task_sequence : INT
  * parent_milestone_id : TEXT
  * position : INT
  * completed_at : TIMESTAMPTZ
  * deleted_at : TIMESTAMPTZ
  * created_at : TIMESTAMPTZ
}

entity "task_dependencies" as td {
  * id : UUID <<PK>>
  --
  * task_id : UUID <<FK→sprint_tasks>> (blocked)
  * depends_on_id : UUID <<FK→sprint_tasks>> (blocker)
  * project_id : UUID <<FK→projects>>
  * workspace_id : UUID <<FK→workspaces>>
  * created_at : TIMESTAMPTZ
}

entity "worker_patterns" as wp {
  * id : UUID <<PK>>
  --
  * workspace_id : UUID <<FK→workspaces>>
  * pattern_type : TEXT
  note: task_incompatibility | group_conflict\n| collaboration_positive | performance_insight
  * member_id : UUID <<FK→team_members>>
  * member_id_a : UUID <<FK→team_members>>
  * member_id_b : UUID <<FK→team_members>>
  * task_type : TEXT
  * task_title : TEXT
  * reason : TEXT
  * severity : TEXT (info|caution|blocker)
  * resolved : BOOLEAN
  * project_id : UUID <<FK→projects>>
  * created_at : TIMESTAMPTZ
}

entity "messages" as msg {
  * id : UUID <<PK>>
  --
  * workspace_id : UUID <<FK→workspaces>>
  * project_id : UUID <<FK→projects>>
  * sender_id : UUID <<FK→auth.users>>
  * content : TEXT
  * is_pinned : BOOLEAN
  * reply_to_id : UUID <<FK→messages>>
  * file_url : TEXT
  * file_name : TEXT
  * file_type : TEXT
  * created_at : TIMESTAMPTZ
}

entity "notifications" as notif {
  * id : UUID <<PK>>
  --
  * user_id : UUID <<FK→auth.users>>
  * type : TEXT
  * title : TEXT
  * body : TEXT
  * link : TEXT
  * read : BOOLEAN
  * created_at : TIMESTAMPTZ
}

entity "team_activity" as ta {
  * id : UUID <<PK>>
  --
  * workspace_id : UUID <<FK→workspaces>>
  * entity_type : TEXT
  * entity_id : UUID
  * activity_type : TEXT
  * description : TEXT
  * team_member_id : UUID <<FK→team_members>>
  * metadata : JSONB
  * created_at : TIMESTAMPTZ
}

entity "project_shares" as ps {
  * id : UUID <<PK>>
  --
  * project_id : UUID <<FK→projects>>
  * workspace_id : UUID <<FK→workspaces>>
  * token : UUID (unique)
  * created_by : UUID <<FK→auth.users>>
  * expires_at : TIMESTAMPTZ
  * is_active : BOOLEAN
  * created_at : TIMESTAMPTZ
}

entity "team_member_edit_history" as eh {
  * id : UUID <<PK>>
  --
  * team_member_id : UUID <<FK→team_members>>
  * edited_by : UUID <<FK→auth.users>>
  * changes : JSONB
  * created_at : TIMESTAMPTZ
}

ws ||--o{ wm : "has members"
ws ||--o{ tm : "has team"
ws ||--o{ proj : "owns"
proj ||--o{ pa : "has assignments"
proj ||--o{ sp : "has sprints"
proj ||--o{ as_ : "has scenarios"
proj ||--o{ ah : "has history"
proj ||--o{ ps : "has share links"
sp ||--o{ st : "has tasks"
st ||--o{ td : "has dependencies"
tm ||--o{ pa : "assigned to"
tm ||--o{ wp : "has patterns"
tm ||--o{ st : "assigned tasks"
tm ||--o{ eh : "edit history"
ws ||--o{ msg : "has messages"
ws ||--o{ notif : "has notifications"
ws ||--o{ ta : "has activity"
@enduml
```

---

## 4. Collaboration Diagram — Document Parsing & Requirement Extraction

```plantuml
@startuml COD_DocumentParsing
skinparam ObjectBackgroundColor #EEF2FF
skinparam ObjectBorderColor #6366F1
skinparam ArrowColor #6366F1
skinparam NoteBackgroundColor #F0F4FF
skinparam NoteBorderColor #6366F1

title Collaboration Diagram — Document Parsing & Requirement Extraction

object "PM (Browser)" as pm
object "New Project Page\n(Next.js Client)" as ui
object "Supabase Storage\n(Private Bucket)" as storage
object "projects table\n(Supabase DB)" as db_proj
object "Process Document API\n/api/process-document" as api
object "PDFLoader\n(LangChain Community)" as pdf
object "GroqModelFactory\n(llama-3.3-70b, temp=0.1)" as groq
object "projectDocumentSchema\n(Zod Validator)" as zod
object "projects table\n(UPDATE)" as db_update

pm -> ui : 1: Upload PDF file\n+ submit project form
ui -> storage : 2: Upload PDF to\nprivate Supabase bucket
storage --> ui : 3: Return signed file URL
ui -> db_proj : 4: INSERT project record\n(ai_status = 'parsing')
db_proj --> ui : 5: Return new project ID
ui -> api : 6: POST { projectId }
api -> db_proj : 7: Fetch project record\n(original_file_url, workspace_id)
db_proj --> api : 8: Project data
api -> storage : 9: fetch(original_file_url)\nDownload PDF as ArrayBuffer
storage --> api : 10: PDF binary data
api -> pdf : 11: new PDFLoader(blob)\n.load()
pdf --> api : 12: Document[]\n(pageContent joined, up to 8000 chars)
api -> groq : 13: invoke([\n  HumanMessage(systemPrompt\n  + documentText)\n])\nwith retry on rate limit (max 2)
groq --> api : 14: Raw AI response text\n(JSON string, may have markdown)
api -> api : 15: extractJson(rawText)\nStrip ```json fences\nFind first { to last }
api -> zod : 16: projectDocumentSchema\n.parse(parsedJSON)\nEnforce array limits:\nmilestones≤8, risks≤6,\nskills≤10, etc.
zod --> api : 17: Validated aiData object
api -> db_update : 18: UPDATE projects SET\nai_data = coreAiData (JSONB)\nai_status = 'completed'\nproject_type = ...\nclient_info = ...\nsuccess_criteria = ...\ncustom_fields = ...
db_update --> api : 19: Update confirmed
api --> ui : 20: { success: true, data: aiData }
ui --> pm : 21: Redirect to project detail page\n(milestones, budget, risks visible)

note bottom of groq
  Extracted fields:
  summary, project_type, budget_estimate,
  currency, timeline_weeks, start_date,
  end_date, client_info, requirements[],
  milestones[], risks[], required_skills[],
  success_criteria[], constraints[],
  assumptions[]
end note

note bottom of api
  On any error:
  UPDATE projects SET ai_status = 'failed'
  Return 500 with error message
end note
@enduml
```
