-- ============================================
-- APO: Team Messaging Tables
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  project_id uuid, -- Optional: If NULL, it's a workspace-wide or direct message
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid, -- Optional: For Direct Messages
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 1. Users can read messages in their workspace (for channels)
CREATE POLICY "Read workspace messages" ON public.messages
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- 2. Users can read direct messages sent to them or by them
CREATE POLICY "Read direct messages" ON public.messages
  FOR SELECT USING (
    receiver_id = auth.uid() OR sender_id = auth.uid()
  );

-- 3. Users can send messages
CREATE POLICY "Send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

-- Enable Realtime for this table
-- NOTE: You also need to toggle this in the Supabase Dashboard UI (Database -> Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
