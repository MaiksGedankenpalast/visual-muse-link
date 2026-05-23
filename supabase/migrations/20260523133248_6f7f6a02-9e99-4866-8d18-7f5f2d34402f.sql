CREATE TABLE public.micro_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) <= 120),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.micro_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own micro_wins" ON public.micro_wins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own micro_wins" ON public.micro_wins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own micro_wins" ON public.micro_wins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own micro_wins" ON public.micro_wins FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_micro_wins_user_date ON public.micro_wins (user_id, date DESC, created_at DESC);