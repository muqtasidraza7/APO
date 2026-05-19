-- ============================================================
-- APO: Analytics Real Data + Task Dependencies Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Actual hours on sprint tasks (for real cost tracking)
ALTER TABLE public.sprint_tasks
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(6,2);

-- 2. Project expenses (hosting, licenses, tools, etc.)
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID        NOT NULL,
  created_by   UUID        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'other',
  description  TEXT        NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  expense_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  currency     TEXT        NOT NULL DEFAULT 'USD',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON public.project_expenses(project_id);

-- 3. Budget change log (who changed the budget and when)
CREATE TABLE IF NOT EXISTS public.budget_change_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id     UUID        NOT NULL,
  changed_by       UUID        NOT NULL,
  changed_by_name  TEXT,
  old_value        NUMERIC(12,2),
  new_value        NUMERIC(12,2) NOT NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_log_project ON public.budget_change_log(project_id);

-- 4. Task dependencies ("Task B cannot start until Task A is complete")
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.sprint_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.sprint_tasks(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL,
  workspace_id  UUID NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_id),
  CHECK(task_id != depends_on_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dep_task    ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dep_blocker ON public.task_dependencies(depends_on_id);

-- 5. Messaging attachments (from earlier session)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS file_url  TEXT;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS file_name TEXT;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS file_type TEXT;
