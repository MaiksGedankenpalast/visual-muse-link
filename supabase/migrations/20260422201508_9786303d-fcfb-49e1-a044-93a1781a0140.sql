CREATE TABLE public.tree_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  current_phase INTEGER NOT NULL DEFAULT 1,
  last_chat_award_at TIMESTAMPTZ,
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tree_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tree_progress"
ON public.tree_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tree_progress"
ON public.tree_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tree_progress"
ON public.tree_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_tree_progress()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.last_update = now();
  -- Phase berechnen
  IF NEW.points >= 15001 THEN NEW.current_phase = 5;
  ELSIF NEW.points >= 5001 THEN NEW.current_phase = 4;
  ELSIF NEW.points >= 1501 THEN NEW.current_phase = 3;
  ELSIF NEW.points >= 501 THEN NEW.current_phase = 2;
  ELSE NEW.current_phase = 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tree_progress_touch
BEFORE INSERT OR UPDATE ON public.tree_progress
FOR EACH ROW EXECUTE FUNCTION public.touch_tree_progress();