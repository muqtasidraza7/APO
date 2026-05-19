-- ============================================================
-- APO: Soft Deletes + Deletion Audit Log Migration
-- Run PART 1 first, wait for it to succeed, then run PART 2.
-- ============================================================

-- ── PART 1: Add deleted_at columns ───────────────────────────
-- Run this block alone first.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes so "active" queries remain fast even as trash grows
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted
  ON public.projects(workspace_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_not_deleted
  ON public.team_members(workspace_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sprints_not_deleted
  ON public.sprints(project_id, start_date) WHERE deleted_at IS NULL;


-- ── PART 2: Deletion audit log ────────────────────────────────
-- Run this block separately after Part 1 succeeds.

CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           TEXT        NOT NULL,   -- 'project' | 'team_member' | 'sprint'
  entity_id             UUID        NOT NULL,
  entity_name           TEXT,
  deleted_by            UUID        NOT NULL,   -- auth.users.id
  deleted_by_name       TEXT,
  workspace_id          UUID        NOT NULL,
  metadata              JSONB       NOT NULL DEFAULT '{}',
  deleted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Recovery tracking
  restored_at           TIMESTAMPTZ,
  restored_by           UUID,
  permanently_deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_workspace
  ON public.deletion_audit_log(workspace_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_entity
  ON public.deletion_audit_log(entity_id, entity_type);

-- Auto-purge: records older than 30 days are permanently deleted.
-- Call this function from a pg_cron job or run manually:
--   SELECT purge_expired_soft_deletes();
CREATE OR REPLACE FUNCTION public.purge_expired_soft_deletes()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
  -- Hard-delete projects that were soft-deleted > 30 days ago
  DELETE FROM public.projects WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  -- Hard-delete team members soft-deleted > 30 days ago
  DELETE FROM public.team_members WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  -- Hard-delete sprints (and cascade to sprint_tasks) soft-deleted > 30 days ago
  DELETE FROM public.sprints WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  -- Mark audit records as permanently deleted
  UPDATE public.deletion_audit_log
  SET permanently_deleted_at = NOW()
  WHERE permanently_deleted_at IS NULL AND deleted_at < cutoff AND restored_at IS NULL;
END;
$$;
