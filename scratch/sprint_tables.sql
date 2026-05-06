-- ============================================
-- APO: SCRUM Sprint Planning Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Table 1: Sprints
CREATE TABLE IF NOT EXISTS public.sprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  goal text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  retrospective_notes text,
  created_at timestamptz DEFAULT now()
);

-- Table 2: Sprint Tasks
CREATE TABLE IF NOT EXISTS public.sprint_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  story_points integer DEFAULT 3,
  status text DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'in_review', 'done')),
  assigned_to uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_by_ai boolean DEFAULT false,
  position integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "workspace_access_sprints" ON public.sprints
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_access_sprint_tasks" ON public.sprint_tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
