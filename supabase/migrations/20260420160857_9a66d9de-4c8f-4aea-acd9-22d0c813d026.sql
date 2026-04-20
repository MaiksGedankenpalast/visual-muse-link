-- reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('weekly', 'four_weekly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  llm_narrative text,
  stats_snapshot jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'error')),
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, period_start)
);

CREATE INDEX idx_reviews_user_type_end ON public.reviews (user_id, type, period_end DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON public.reviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- user_app_start table
CREATE TABLE public.user_app_start (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  first_seen_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_app_start ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app start" ON public.user_app_start
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app start" ON public.user_app_start
  FOR INSERT WITH CHECK (auth.uid() = user_id);