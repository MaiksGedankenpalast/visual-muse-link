-- 1. Create user_challenges link table
CREATE TABLE public.user_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (user_id, challenge_id)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user_challenges"
ON public.user_challenges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_challenges"
ON public.user_challenges FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_challenges"
ON public.user_challenges FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_challenges"
ON public.user_challenges FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_user_challenges_user ON public.user_challenges(user_id, is_active);

-- 2. Extend daily_completions with status + notes
ALTER TABLE public.daily_completions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill status from existing completed flag
UPDATE public.daily_completions
SET status = CASE WHEN completed = true THEN 'completed' ELSE 'missed' END
WHERE status = 'pending';

-- Add check constraint for valid status values
ALTER TABLE public.daily_completions
  DROP CONSTRAINT IF EXISTS daily_completions_status_check;
ALTER TABLE public.daily_completions
  ADD CONSTRAINT daily_completions_status_check
  CHECK (status IN ('completed', 'partial', 'missed', 'pending'));

-- Ensure unique constraint for upserts (user, challenge, date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_completions_user_challenge_date_unique'
  ) THEN
    ALTER TABLE public.daily_completions
      ADD CONSTRAINT daily_completions_user_challenge_date_unique
      UNIQUE (user_id, challenge_id, date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_completions_user_date
  ON public.daily_completions(user_id, date);