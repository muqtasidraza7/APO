# APO Codebase Learning Guide (2-Day Viva Prep)

## Project Overview

**APO** is a project portfolio management + AI-powered team allocation system. It helps teams manage projects, sprints, tasks, and intelligently allocate resources using LLMs (LangChain/Groq).

**Stack**: Next.js 15 + React 19 + Supabase + LangChain + TypeScript + Tailwind CSS

---

## 🎯 Core Features (What You Need to Know)

1. **Projects & Sprints** - Create projects, break them into sprints with tasks
2. **Team Management** - Add team members, assign roles
3. **AI Task Assignment** - LLMs analyze project needs and suggest task assignments
4. **Analytics & Allocation** - Visualize team capacity and project progress
5. **Messaging** - In-app communication between team members
6. **Document Processing** - Parse PDFs (CVs, requirements) to extract info
7. **Notifications** - Real-time alerts for events

---

## 📂 Project Structure

```
src/app/
├── (auth)/              → Login, signup, authentication
├── (dashboard)/         → Main app features (projects, sprints, team)
│   └── dashboard/
│       ├── page.tsx            (home)
│       ├── projects/           (project management)
│       ├── team/               (team management)
│       ├── sprints/            (sprint management)
│       ├── messages/           (messaging)
│       ├── analytics/          (dashboards)
│       └── allocation/         (resource allocation)
├── api/                 → Backend routes
│   ├── sprints/         (sprint CRUD + AI population)
│   ├── assign-tasks/    (AI task assignment)
│   ├── messages/        (messaging API)
│   ├── analytics/       (data queries)
│   └── ...
├── components/          → Reusable UI components
├── utils/              → Helper functions, schemas
└── onboarding/         → Onboarding flow
```

---

## 🚀 Day 1 Learning Plan (Foundational)

### Morning (2-3 hours)

**Goal**: Understand architecture and data flow

1. **Check entry point**
   - `src/app/layout.tsx` - Root layout setup
   - `src/app/(dashboard)/dashboard/layout.tsx` - Dashboard structure
2. **Understand database schema**
   - Check Supabase tables in your .env.local
   - Look at `src/utils/schemas.ts` - Zod validation schemas
   - These show: users, projects, tasks, sprints, team_members tables
3. **Read recent commits** (to understand recent changes)
   ```bash
   git log --oneline -10
   ```
   Key commits: "feat: add sprint feature", "feat: integrate LangChain"

### Afternoon (2-3 hours)

**Goal**: Understand data fetching and state management

1. **How data flows**:
   - UI Components (TSX) → API Routes (`/api/...`) → Supabase Database
   - No Redux/Context - uses Server Components + server actions

2. **Key pattern to understand: Server Actions**
   - Files like `src/app/(dashboard)/dashboard/projects/actions.ts`
   - These are backend functions called from frontend
   - Used for: creating projects, adding members, updating tasks

3. **Read core server action files**:
   - `projects/actions.ts` - Create/delete projects
   - `team/actions.ts` - Manage team
   - `sprints/` files - Sprint CRUD operations

---

## 🎓 Day 2 Learning Plan (Hands-On)

### Morning (2-3 hours)

**Goal**: Understand AI integration and API routes

1. **AI Features** (LangChain integration)
   - `src/app/api/sprints/ai-populate/route.ts` - AI generates tasks for sprint
   - `src/app/api/assign-tasks/route.ts` - AI assigns tasks to team members
   - `src/app/api/process-document/route.ts` - Process PDFs with LLMs
   - Study how LangChain chains are built

2. **Key concepts**:
   - LLMs take project description → generate tasks
   - Analyzes team skills → recommends task assignments
   - These use Groq API (fast inference)

3. **Try running**:
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Create a project → Create a sprint → Click "AI Populate"
   ```

### Afternoon (2-3 hours)

**Goal**: Component structure and UI patterns

1. **Understand UI component hierarchy**:
   - `components/` folder has reusable components
   - Each dashboard page (projects, team, sprints) has a Client component
   - Pattern: Page Server Component → loads data → renders Client Component → event handlers

2. **Study 2-3 important pages**:
   - `dashboard/projects/page.tsx` - How projects list is built
   - `dashboard/projects/[id]/sprints/page.tsx` - Dynamic routing
   - `dashboard/team/page.tsx` - Team management UI

3. **UI patterns to note**:
   - Tailwind CSS styling (no CSS modules)
   - Lucide icons for UI
   - Recharts for analytics/graphs
   - Framer Motion for animations

---

## 🎯 What to Focus on for Viva

### You'll Likely Be Asked About:

**1. Data Flow**

- "How does a project get created?"
- Answer: User fills form → Server Action in `projects/actions.ts` → Supabase insert → Page revalidation

**2. AI Features**

- "How does task assignment work?"
- Answer: User provides requirements → LangChain prompt → Groq API → AI suggests allocations

**3. Component Structure**

- "How are projects displayed?"
- Answer: Server Component fetches from DB → renders ProjectsClient → Client Component handles interactions

**4. API Routes**

- "Walk us through the sprint creation flow"
- Answer: Frontend calls `/api/sprints/create` → validates → creates in DB → returns response

### Example Viva Question Scenarios:

- ✅ "Add a new field to projects (e.g., budget)"
- ✅ "Create a new API endpoint for reporting"
- ✅ "Modify the AI task assignment logic"
- ✅ "Add a new dashboard page"

---

## 🔑 Key Files to Master (Read These First)

| File                                                | Why                       | Time   |
| --------------------------------------------------- | ------------------------- | ------ |
| `package.json`                                      | Understand dependencies   | 5 min  |
| `src/utils/schemas.ts`                              | Data structure/validation | 10 min |
| `src/app/(dashboard)/dashboard/layout.tsx`          | App structure             | 10 min |
| `src/app/(dashboard)/dashboard/projects/actions.ts` | Server action pattern     | 15 min |
| `src/app/api/sprints/ai-populate/route.ts`          | AI integration            | 20 min |
| `src/app/(dashboard)/dashboard/projects/page.tsx`   | Full page flow            | 15 min |
| `src/app/components/AIAssignPanel.tsx`              | UI component pattern      | 10 min |

**Total: ~1.5 hours to understand core patterns**

---

## 🛠️ Quick Hands-On Exercises

### Exercise 1: Add a Field (30 min)

1. Add `priority` field to projects
2. Update Supabase schema (or mock)
3. Update Zod schema in `utils/schemas.ts`
4. Show it on project card
5. Save to DB via server action

### Exercise 2: Create Simple API (30 min)

1. Create `/api/projects/[id]/summary` endpoint
2. Fetch project + stats from DB
3. Return JSON response
4. Call from a page component

### Exercise 3: Modify AI Logic (30 min)

1. Open `src/app/api/assign-tasks/route.ts`
2. Change prompt to add a new constraint
3. Test the AI flow

---

## 📝 Study Checklist

- [ ] Read package.json and understand all dependencies
- [ ] Run `npm run dev` and explore the live app
- [ ] Trace one complete feature: Create Project → Create Sprint → Add Tasks
- [ ] Read one server action file completely
- [ ] Read one API route completely
- [ ] Understand the schema structure
- [ ] Try making one small UI change
- [ ] Understand how LangChain integration works

---

## 🆘 When Asked During Viva

1. **"Explain the flow of [feature]"**
   - Be specific: mention Server Components, Server Actions, API routes, Supabase
2. **"Where would you add [feature]?"**
   - Think aloud: "I'd create a new Server Action in `actions.ts`, add an API route if needed, then create a new page component"
3. **"Show me the code for [feature]"**
   - Navigate confidently to files using: Ctrl+Shift+P → "Go to File"
4. **"Can you modify [feature]?"**
   - Ask clarifying questions, then:
     - Identify the file to edit
     - Show the changes
     - Explain what will happen

---

## 🎯 TL;DR - Minimum Viable Knowledge

If you have only 4 hours:

1. **1 hour**: Run app, click around, understand features
2. **1 hour**: Read `schemas.ts` + one server action + one API route
3. **1 hour**: Understand the LangChain integration (skim `ai-populate/route.ts`)
4. **1 hour**: Make one small change (add a field, change UI color, add a log)

This will give you enough to answer most viva questions confidently.

---

## Questions to Ask Yourself (Self-Test)

- What does LangChain do in this project?
- How does a user create a project?
- Where does the AI assignment logic live?
- What's the difference between Server Components and Client Components?
- How is team data stored?
- What's a Server Action and when are they used?

If you can answer all these, you're ready for the viva! 🎉
