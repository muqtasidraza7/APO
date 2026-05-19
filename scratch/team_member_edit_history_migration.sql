-- Team Member Edit History Migration
-- Run once in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS team_member_edit_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID        NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  workspace_id    UUID        NOT NULL,
  changed_by      UUID        NOT NULL,           -- auth user id of the editor
  changed_by_name TEXT,                           -- display name snapshot
  field           TEXT        NOT NULL,           -- e.g. 'capacity_hours_per_week'
  old_value       TEXT,
  new_value       TEXT,
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-member lookups
CREATE INDEX IF NOT EXISTS idx_tmeh_member_id
  ON team_member_edit_history (member_id, changed_at DESC);

-- RLS: only workspace members can read; inserts done server-side via service role
ALTER TABLE team_member_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can read edit history" ON team_member_edit_history;

CREATE POLICY "Workspace members can read edit history"
  ON team_member_edit_history
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
