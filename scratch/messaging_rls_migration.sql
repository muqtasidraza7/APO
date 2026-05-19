-- =============================================================================
-- Messaging RLS Migration
-- =============================================================================
-- This file must be run in the Supabase SQL editor (Dashboard → SQL Editor).
-- It replaces the existing RLS policies on the public.messages table with
-- new policies that correctly enforce workspace and project-level access
-- control for the Slack-like messaging feature.
--
-- IMPORTANT: Run this migration BEFORE using the new messaging API routes.
-- Failure to apply this migration means project-channel access control will
-- not be enforced at the database level.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Step 1: Drop existing policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Read workspace messages" ON public.messages;
DROP POLICY IF EXISTS "Read direct messages" ON public.messages;
DROP POLICY IF EXISTS "Send messages" ON public.messages;


-- -----------------------------------------------------------------------------
-- Step 2: Create new SELECT policies
-- -----------------------------------------------------------------------------

-- Policy 1: SELECT — General channel (project_id IS NULL, receiver_id IS NULL)
-- Any authenticated workspace member can read general channel messages.
CREATE POLICY "select_general_channel_messages" ON public.messages
  FOR SELECT USING (
    project_id IS NULL
    AND receiver_id IS NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: SELECT — Project channel messages (project_id IS NOT NULL)
-- Only workspace members who are also project members can read.
-- Note: With the current schema, all workspace members are considered project
-- members (no separate project_members table). The policy verifies the project
-- exists in the workspace and the user is a workspace member.
CREATE POLICY "select_project_channel_messages" ON public.messages
  FOR SELECT USING (
    project_id IS NOT NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
    AND project_id IN (
      SELECT p.id FROM public.projects p
      INNER JOIN public.team_members tm
        ON tm.workspace_id = p.workspace_id
        AND tm.user_id = auth.uid()
      WHERE p.id = messages.project_id
    )
  );


-- -----------------------------------------------------------------------------
-- Step 3: Create new INSERT policies
-- -----------------------------------------------------------------------------

-- Policy 3: INSERT — General channel
-- Any authenticated workspace member can send to the general channel.
CREATE POLICY "insert_general_channel_messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND project_id IS NULL
    AND receiver_id IS NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 4: INSERT — Project channel
-- Only workspace members can send to project channels.
CREATE POLICY "insert_project_channel_messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND project_id IS NOT NULL
    AND workspace_id IN (
      SELECT workspace_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
    AND project_id IN (
      SELECT p.id FROM public.projects p
      INNER JOIN public.team_members tm
        ON tm.workspace_id = p.workspace_id
        AND tm.user_id = auth.uid()
      WHERE p.id = messages.project_id
    )
  );


-- -----------------------------------------------------------------------------
-- Step 4: Create performance indexes
-- -----------------------------------------------------------------------------

-- Index for history queries: workspace + project filter + ordering
CREATE INDEX IF NOT EXISTS idx_messages_workspace_project_created
  ON public.messages (workspace_id, project_id, created_at ASC);

-- Index for general channel queries (project_id IS NULL, receiver_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_messages_workspace_general
  ON public.messages (workspace_id, created_at ASC)
  WHERE project_id IS NULL AND receiver_id IS NULL;
