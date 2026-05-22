-- Drop all challenge-related tables (cascade drops dependent FKs/policies)
DROP TABLE IF EXISTS public.challenge_responses CASCADE;
DROP TABLE IF EXISTS public.daily_completions CASCADE;
DROP TABLE IF EXISTS public.user_challenges CASCADE;
DROP TABLE IF EXISTS public.smart_challenges CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;

-- Allow multiple mood entries per user per day
ALTER TABLE public.mood_entries DROP CONSTRAINT IF EXISTS mood_entries_user_id_date_key;

-- Index for fast "today's entries" lookups
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date_created
  ON public.mood_entries (user_id, date, created_at DESC);
