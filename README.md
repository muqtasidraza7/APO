# APO — AI-Powered Project Orchestrator

APO is a project management platform for software teams that uses AI to allocate team members to milestones, track sprint progress, analyze costs, and surface actionable insights — all in one workspace.

## Features

- **AI Allocation** — Automatically assigns team members to milestones based on skills, availability, and dependencies using LangChain + Groq
- **Sprint Management** — Create and manage sprints with task tracking, burndown, and velocity metrics
- **Analytics** — Cost breakdowns, expense tracking, and project health insights
- **Team Management** — Role-based access (Owner, PM, Member, Client) with invite links
- **Messaging** — Slack-style threaded channels with @mentions and role-based access
- **Notifications** — Real-time bell notifications for task assignments, mentions, and project events
- **Onboarding** — Invite-link based onboarding with role pre-fill

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database & Auth | Supabase (PostgreSQL + RLS) |
| AI | LangChain + Groq (llama-3.3-70b) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Animations | Framer Motion |
| Schema Validation | Zod |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Deployment

Deploy to [Vercel](https://vercel.com) by connecting your GitHub repository and adding the environment variables above in the Vercel project settings.

## Project Structure

```
src/
  app/
    (auth)/         # Login, register, forgot/reset password
    (dashboard)/    # All authenticated dashboard pages
      dashboard/
        projects/   # Project detail, sprints, allocation, analytics
        team/       # Team management
        insights/   # Workspace analytics
    api/            # API route handlers
    components/     # Shared UI components
    onboarding/     # New user + invite onboarding flow
    utils/          # Supabase clients, schemas, helpers
```

## Role Permissions

| Feature | Owner | PM | Member | Client |
|---|---|---|---|---|
| Create projects | Yes | Yes | No | No |
| Manage team | Yes | Yes | No | No |
| View analytics | Yes | Yes | No | No |
| View sprints | Yes | Yes | Yes | No |
| View allocation | Yes | Yes | Yes | No |
| Client view | Yes | Yes | No | Yes |
