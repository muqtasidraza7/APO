-- Project Share Tokens Migration
-- Run once in Supabase SQL Editor.
-- Enables shareable read-only links for client review.

CREATE TABLE IF NOT EXISTS project_shares (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID        NOT NULL,
  token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by   UUID        NOT NULL,   -- auth.users.id of the creator
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,            -- NULL = never expires
  is_active    BOOLEAN     DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_project_shares_token
  ON project_shares (token)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_shares_project_id
  ON project_shares (project_id);

-- RLS: token lookup is intentionally PUBLIC (no auth required for share pages)
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Workspace members can read their own shares (for listing share links in UI)
DROP POLICY IF EXISTS "Workspace members can read project shares" ON project_shares;
CREATE POLICY "Workspace members can read project shares"
  ON project_shares
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Anyone can read an active share by its token (public share page)
DROP POLICY IF EXISTS "Public token lookup" ON project_shares;
CREATE POLICY "Public token lookup"
  ON project_shares
  FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Only authenticated workspace members can insert/deactivate shares
DROP POLICY IF EXISTS "Workspace members can insert shares" ON project_shares;
CREATE POLICY "Workspace members can insert shares"
  ON project_shares
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can deactivate shares" ON project_shares;
CREATE POLICY "Workspace members can deactivate shares"
  ON project_shares
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
