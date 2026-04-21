CREATE TABLE IF NOT EXISTS public.challenge_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  response_text_1 TEXT,
  response_text_2 TEXT,
  response_text_3 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, date)
);

ALTER TABLE public.challenge_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge responses"
  ON public.challenge_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge responses"
  ON public.challenge_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge responses"
  ON public.challenge_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenge responses"
  ON public.challenge_responses FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_challenge_responses_user_date
  ON public.challenge_responses (user_id, date DESC);