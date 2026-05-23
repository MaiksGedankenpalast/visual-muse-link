
ALTER TABLE public.mood_entries RENAME TO mood_entries_backup;

CREATE TABLE public.mood_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  eingabe_typ text NOT NULL DEFAULT 'schnell' CHECK (eingabe_typ IN ('schnell','tief')),

  stimmung integer NOT NULL DEFAULT 50 CHECK (stimmung BETWEEN 0 AND 100),
  energie integer NOT NULL DEFAULT 50 CHECK (energie BETWEEN 0 AND 100),
  stress integer NOT NULL DEFAULT 50 CHECK (stress BETWEEN 0 AND 100),

  pos_zufriedenheit integer CHECK (pos_zufriedenheit BETWEEN 0 AND 100),
  pos_motivation integer CHECK (pos_motivation BETWEEN 0 AND 100),
  pos_dankbarkeit integer CHECK (pos_dankbarkeit BETWEEN 0 AND 100),
  pos_verbundenheit integer CHECK (pos_verbundenheit BETWEEN 0 AND 100),

  neg_erschoepfung integer CHECK (neg_erschoepfung BETWEEN 0 AND 100),
  neg_angst integer CHECK (neg_angst BETWEEN 0 AND 100),
  neg_traurigkeit integer CHECK (neg_traurigkeit BETWEEN 0 AND 100),
  neg_einsamkeit integer CHECK (neg_einsamkeit BETWEEN 0 AND 100),

  opt_slot_1_name text,
  opt_slot_1_wert integer CHECK (opt_slot_1_wert BETWEEN 0 AND 100),
  opt_slot_2_name text,
  opt_slot_2_wert integer CHECK (opt_slot_2_wert BETWEEN 0 AND 100),

  tags text[]
);

CREATE INDEX idx_mood_entries_v2_user_date_created
  ON public.mood_entries (user_id, date, created_at DESC);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moods"
  ON public.mood_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own moods"
  ON public.mood_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own moods"
  ON public.mood_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own moods"
  ON public.mood_entries FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_entries;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS opt_slot_1_name text,
  ADD COLUMN IF NOT EXISTS opt_slot_2_name text;
