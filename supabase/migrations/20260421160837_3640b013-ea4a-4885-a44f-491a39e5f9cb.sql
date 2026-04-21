CREATE TABLE public.smart_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  prompt_context text,
  challenge_text text NOT NULL,
  rationale text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.smart_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own smart challenges"
  ON public.smart_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own smart challenges"
  ON public.smart_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own smart challenges"
  ON public.smart_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own smart challenges"
  ON public.smart_challenges FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_smart_challenges_user_date ON public.smart_challenges(user_id, date DESC);