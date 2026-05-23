CREATE TABLE public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memory_type text NOT NULL CHECK (memory_type IN ('wochenbrief','monatsbrief')),
  content text NOT NULL,
  periode_start date NOT NULL,
  periode_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory" ON public.user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON public.user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memory" ON public.user_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memory" ON public.user_memory FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_memory_user_type_created ON public.user_memory (user_id, memory_type, created_at DESC);