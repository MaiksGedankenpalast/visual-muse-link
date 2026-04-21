CREATE TABLE public.safety_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  triggered_rule text NOT NULL,
  user_message text,
  session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own safety logs"
  ON public.safety_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own safety logs"
  ON public.safety_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_safety_logs_user_created ON public.safety_logs(user_id, created_at DESC);