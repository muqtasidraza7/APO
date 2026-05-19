# Implementation Details
## Assistant Project Officer (APO)

---

## System Architecture Overview

APO is built as a modern full-stack web application using the **Next.js 14 App Router**. This architecture enables React Server Components (RSC), which execute database queries and business logic entirely on the server, keeping the client bundle lean and secure. The application is structured around three layers: a server-rendered UI layer, a set of API routes and Server Actions for mutations, and a Supabase backend for persistence, authentication, storage, and real-time communication.

The frontend is built with **React** and **Tailwind CSS**, using **Framer Motion** for animations. All AI capabilities are powered by the **Groq API** running the **Llama 3-70b** model, orchestrated through **LangChain** prompt templates. The entire stack is deployable to Vercel with zero configuration.

---

## Database and Backend

The database is a **PostgreSQL** relational schema hosted on **Supabase**. Core tables include `workspaces`, `workspace_members`, `team_members`, `projects`, `sprints`, `sprint_tasks`, `project_assignments`, `worker_patterns`, `messages`, `notifications`, and `team_activity`.

A key design decision was storing all AI-extracted project data in a **JSONB column** (`ai_data`) on the projects table. This stores milestones, risks, required skills, budget, client information, constraints, and assumptions in a single flexible field, allowing schema evolution without costly migrations as the AI output format improves.

**Multi-tenant data isolation** is enforced through Supabase **Row Level Security (RLS)** policies. Every table is scoped to `workspace_id`, ensuring users can only query data belonging to their own workspace. A second layer of protection is provided by **Next.js Middleware**, which intercepts all requests to `/dashboard/*` routes and validates the presence of a valid Supabase session cookie before the page ever loads. Privileged API routes additionally perform a server-side role check using the Supabase Admin client, returning `403 Forbidden` if the caller's role (owner, pm, member, client) does not meet the required permission.

**Soft deletes** are used throughout — projects, sprints, and team members are never permanently removed on user action. A `deleted_at` timestamp is set instead, and all queries filter with `.is("deleted_at", null)`. Sprints in the trash are permanently purged after 30 days.

---

## Intelligent Document Processing

Project creation begins with a PDF upload (Project Charter or RFP). The processing pipeline works as follows:

1. **Ingestion** — The PDF is uploaded to a private Supabase Storage bucket. The project record is created immediately with `ai_status = "parsing"` so the UI can show a loading state.
2. **Extraction** — A Node.js API route (`/api/process-document`) uses the `pdf2json` library to decode the binary PDF into raw text. A custom wrapper handles URI decoding safely and falls back to raw text processing if decoding fails, ensuring the system remains stable with complex or non-standard PDF formats.
3. **Semantic Analysis** — The extracted text is sent to the Groq API with a strict system prompt that explicitly prohibits conversational filler and requires a valid JSON response with defined keys (`budget_estimate`, `milestones`, `risks`, `required_skills`, `timeline_weeks`, `client_info`, `success_criteria`, etc.). A post-processing step strips any Markdown syntax (e.g., ` ```json ` tags) before parsing. On success, `ai_status` is updated to `"completed"` and the `ai_data` JSONB column is populated. On failure, `ai_status` is set to `"failed"`.

---

## AI-Powered Resource Allocation

The allocation engine operates in two stages:

1. **Data Retrieval** — The system fetches the project's milestones and required skills, all workspace team members with their skill tags, capacity, and performance scores, and all active `worker_patterns` (task incompatibilities, group conflicts, positive collaborations).
2. **Semantic Matching** — Both datasets are submitted to the Groq LLM with a context-sensitive prompt framed as a logic puzzle. The AI performs semantic reasoning — for example, understanding that a "Frontend Developer" is appropriate for a milestone requiring "React Components" even without an exact keyword match. The prompt enforces pattern constraints: BLOCKER members are excluded from restricted task types, CAUTION members may be assigned with a warning in the reasoning field, and members with a group conflict are never co-assigned to the same milestone. Assignments (1–5 members per milestone) are returned as structured JSON and inserted into the `project_assignments` table.

The **Assignment Explainer** (`/api/explain-assignment`) and **AI Insights** (`/api/insights`) features use the same Groq + LangChain pipeline, building enriched context objects from sprint history, patterns, activity logs, and milestone data before constructing a `PromptTemplate` and invoking the model.

**Performance scores** are maintained automatically. Each team member starts at 100. Recording a BLOCKER pattern deducts 20 points, CAUTION deducts 10, and INFO deducts 3. Resolving a pattern restores its deduction. The AI uses these scores as a weighting factor during allocation.

---

## Sprint Management and Task Board

Sprints are created with a name, goal, date range, and an optional linked milestone. The system prevents sprint creation for milestones already marked as completed. Sprints follow a three-state lifecycle: `planning → active → completed`.

The sprint board is a client-side Kanban with four columns: Backlog, In Progress, In Review, and Done. Tasks are moved via **drag-and-drop** with optimistic UI updates — the local state updates immediately and the server call runs in the background, reverting on failure. **Task dependencies** are enforced client-side: a task with unmet blockers cannot be dragged to In Progress, and a cycle-detection algorithm (BFS traversal) prevents circular dependency chains.

The **AI Populate** feature (`/api/sprints/ai-populate`) generates sprint tasks automatically from the linked milestone's data and team assignments. It is disabled for standalone sprints not linked to a milestone. For milestone-linked sprints, the assignee picker is scoped to only the members assigned to that milestone.

The **burndown bar** on the sprint board compares ideal progress (`days_elapsed / total_days`) against actual completion (`done_hours / total_hours`) in real time. A dedicated Burndown Chart page renders the full graph over the sprint duration.

---

## Real-Time Messaging

The messaging module uses **Supabase Realtime** Postgres change subscriptions. When a user selects a channel (General or per-project), the client subscribes to `INSERT` and `UPDATE` events on the `messages` table filtered by `workspace_id` or `project_id`. Incoming messages are enriched client-side using a `senderMapRef` (a `Map<userId, fullName>`) to avoid repeated database lookups.

The system handles connection failures gracefully: on `CHANNEL_ERROR` or `TIMED_OUT` status, a reconnect timer fires after 3 seconds by incrementing a `reconnectKey` state variable, which forces the subscription `useEffect` to re-run. A manual Retry Now button is also provided. Message features include threaded replies (with parent message preview), pin/unpin (with real-time state sync via `UPDATE` events), file attachments (uploaded to Supabase Storage), `@mention` autocomplete, and in-channel search.

---

## Live Roadmap and Simulation Engine

The roadmap renders all project assignments on a weekly timeline grid. The current week is calculated from the project start date and highlighted as TODAY. Past weeks are visually dimmed. Clicking a task row toggles its completion status via a **Next.js Server Action**, which updates `project_assignments.status` and inserts a `team_activity` record, then calls `revalidatePath` to push the updated state to the client without a full page reload.

The **Simulate Next Week** button triggers a server-side state machine that advances the project by one week, automatically completing due tasks and generating weighted activity log entries (successes, delays, warnings). This uses the same `revalidatePath` pattern for seamless UI updates.

---

## Gantt Chart

The Gantt chart is a pure client-side SVG-based timeline rendered in a `<div>` with `overflow-x: auto`. The timeline snaps to the Monday of the project start week and extends to the last sprint end date plus a 10-day buffer. Milestone and sprint bars are positioned using percentage-based `left` and `width` CSS values calculated from the total timeline duration. Milestone bars end with a rotated diamond marker. A TODAY vertical line is drawn at the current date's position. Both the milestone and sprint groups are independently collapsible via toggle buttons.

---

## AI Risk Radar

The Risk Radar is a server-rendered page that computes risks on every load from four data sources: active sprint burndown rates, team member capacity vs. assigned hours, unresolved `worker_patterns`, and milestone deadlines. Risks are classified into Critical, High, and Medium severity using threshold-based rules (e.g., burndown gap > 35% = Critical). Results are sorted by severity and rendered as risk cards with category labels, descriptions, detail chips, and navigation links to the relevant remediation page.

---

## Key Technical Challenges and Solutions

| Challenge | Problem | Solution |
|---|---|---|
| **User Authentication** | Synchronising auth state between client UI and server-side DB operations | Supabase Auth with HTTP-only secure session cookies managed via Next.js Middleware |
| **PDF Parsing** | Standard libraries produced garbled text or crashed on special characters | Custom `pdf2json` wrapper with safe URI decoding and raw text fallback |
| **Structured LLM Output** | Standard prompts produced conversational text or Markdown, breaking the JSON parser | Groq API with strict system prompts prohibiting filler; post-processing strips Markdown before parsing |
| **Semantic Resource Matching** | Keyword queries could not match "Frontend Developer" to "React Components" task | Two-stage LLM approach: retrieve raw data, then submit as a logic puzzle for semantic reasoning |
| **Multi-Tenant Data Isolation** | Users accessing direct URLs could potentially reach other workspaces' data | Supabase RLS policies at DB level + Next.js Middleware session check at route level |
| **Real-Time State Sync** | Updating Gantt chart and generating logs without a full page reload | Next.js Server Actions with `revalidatePath` for instant server-to-client state propagation |
| **Task Dependency Enforcement** | Preventing circular dependency chains in sprint task graph | Client-side BFS cycle detection before any dependency insert is accepted |
| **Realtime Connection Reliability** | Supabase Realtime channels occasionally time out or error | Auto-reconnect via `reconnectKey` state increment with 3-second delay and manual retry button |
