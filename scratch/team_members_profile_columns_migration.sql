-- Add profile columns to team_members
-- Run once in Supabase SQL Editor.

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS experience_level    TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS hourly_rate         NUMERIC(10, 2);
