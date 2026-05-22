-- =============================================================================
-- APO Messaging: Thread Support Migration
-- Run this in Supabase Dashboard → SQL Editor BEFORE deploying the new code.
-- =============================================================================

-- 1. Add threading columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS thread_root_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS thread_reply_count integer NOT NULL DEFAULT 0;

-- 2. Trigger: auto-increment thread_reply_count when a thread reply is inserted
CREATE OR REPLACE FUNCTION increment_thread_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.thread_root_id IS NOT NULL THEN
    UPDATE public.messages
      SET thread_reply_count = thread_reply_count + 1
      WHERE id = NEW.thread_root_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_thread_reply_count ON public.messages;
CREATE TRIGGER trg_increment_thread_reply_count
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION increment_thread_reply_count();

-- 3. Trigger: auto-decrement thread_reply_count when a thread reply is deleted
CREATE OR REPLACE FUNCTION decrement_thread_reply_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.thread_root_id IS NOT NULL THEN
    UPDATE public.messages
      SET thread_reply_count = GREATEST(0, thread_reply_count - 1)
      WHERE id = OLD.thread_root_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_thread_reply_count ON public.messages;
CREATE TRIGGER trg_decrement_thread_reply_count
  BEFORE DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION decrement_thread_reply_count();

-- 4. Index for thread reply queries (fast lookup by thread root)
CREATE INDEX IF NOT EXISTS idx_messages_thread_root_created
  ON public.messages (thread_root_id, created_at ASC)
  WHERE thread_root_id IS NOT NULL;

-- 5. No RLS changes needed:
--    Thread replies to general channel have project_id IS NULL → existing general policy applies
--    Thread replies to project channel have project_id IS NOT NULL → existing project policy applies
--    Both INSERT and SELECT policies handle thread replies correctly via workspace_id / project_id checks.

-- Verify the columns were added:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'messages'
  AND column_name IN ('thread_root_id', 'thread_reply_count')
ORDER BY column_name;
