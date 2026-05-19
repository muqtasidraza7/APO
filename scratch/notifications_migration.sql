-- ============================================================
-- APO: Notifications Migration
-- Run PART 1 first, then PART 2 as a separate query execution
-- ============================================================

-- ── PART 1: notifications table ──────────────────────────────
-- Run this block first and wait for it to complete.

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.notifications FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.notifications FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Service role can insert notifications'
  ) THEN
    CREATE POLICY "Service role can insert notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;


-- ── PART 2: add pref columns to team_members ─────────────────
-- Run this block separately after Part 1 succeeds.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS notify_tasks    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_risks    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sprints  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_mentions BOOLEAN NOT NULL DEFAULT true;
