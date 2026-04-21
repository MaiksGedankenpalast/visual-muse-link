ALTER TABLE public.daily_completions
ADD COLUMN IF NOT EXISTS response_data JSONB;