-- ============================================
-- APO: Sprint Schema Migration
-- Add milestone association and replace story points
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add milestone_ids to sprints table
ALTER TABLE public.sprints
ADD COLUMN IF NOT EXISTS milestone_ids TEXT[] DEFAULT '{}';

-- 2. Update sprint_tasks table: Replace story_points with effort tracking
ALTER TABLE public.sprint_tasks
DROP COLUMN IF EXISTS story_points;

ALTER TABLE public.sprint_tasks
ADD COLUMN IF NOT EXISTS effort_level TEXT DEFAULT 'medium' CHECK (effort_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS time_estimate_hours INTEGER,
ADD COLUMN IF NOT EXISTS task_sequence INTEGER;

-- 3. Add parent milestone tracking
ALTER TABLE public.sprint_tasks
ADD COLUMN IF NOT EXISTS parent_milestone_id TEXT;

-- Add index for milestone-based queries
CREATE INDEX IF NOT EXISTS idx_sprints_milestone_ids ON public.sprints USING GIN(milestone_ids);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_parent_milestone ON public.sprint_tasks(parent_milestone_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sequence ON public.sprint_tasks(sprint_id, task_sequence);
