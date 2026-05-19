-- ============================================================
-- APO: Allocation Scenarios + History Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Named snapshots the PM can save and compare
CREATE TABLE IF NOT EXISTS public.allocation_scenarios (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id     UUID        NOT NULL,
  name             TEXT        NOT NULL,
  source           TEXT        NOT NULL DEFAULT 'ai',   -- 'ai' | 'manual'
  note             TEXT,
  created_by       UUID        NOT NULL,
  created_by_name  TEXT,
  assignments      JSONB       NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alloc_scenarios_project ON public.allocation_scenarios(project_id);

-- Immutable audit log: every AI run, manual edit, undo
CREATE TABLE IF NOT EXISTS public.allocation_history (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id      UUID        NOT NULL,
  action            TEXT        NOT NULL,   -- 'ai_run' | 'manual_edit' | 'scenario_activated' | 'undone'
  note              TEXT,
  performed_by      UUID        NOT NULL,
  performed_by_name TEXT,
  assignment_count  INTEGER     NOT NULL DEFAULT 0,
  assignments_before JSONB      NOT NULL DEFAULT '[]',
  assignments_after  JSONB      NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alloc_history_project ON public.allocation_history(project_id, created_at DESC);
