CREATE TABLE public.vibe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  is_suggestion BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vibe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vibe items" ON public.vibe_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vibe items" ON public.vibe_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vibe items" ON public.vibe_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vibe items" ON public.vibe_items FOR DELETE USING (auth.uid() = user_id);