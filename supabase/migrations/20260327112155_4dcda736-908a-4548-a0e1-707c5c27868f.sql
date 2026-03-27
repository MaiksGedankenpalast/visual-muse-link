
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  onboarding_goals TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Mood entries table
CREATE TABLE public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  happy_sad INTEGER NOT NULL DEFAULT 50 CHECK (happy_sad >= 0 AND happy_sad <= 100),
  calm_anxious INTEGER NOT NULL DEFAULT 50 CHECK (calm_anxious >= 0 AND calm_anxious <= 100),
  confident_insecure INTEGER NOT NULL DEFAULT 50 CHECK (confident_insecure >= 0 AND confident_insecure <= 100),
  excited_bored INTEGER NOT NULL DEFAULT 50 CHECK (excited_bored >= 0 AND excited_bored <= 100),
  rested_tired INTEGER NOT NULL DEFAULT 50 CHECK (rested_tired >= 0 AND rested_tired <= 100),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moods" ON public.mood_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own moods" ON public.mood_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own moods" ON public.mood_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own moods" ON public.mood_entries FOR DELETE USING (auth.uid() = user_id);

-- Journal entries table
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'Personal',
  mood_snapshot INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  is_preset BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view presets and own challenges" ON public.challenges FOR SELECT USING (is_preset = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);

-- Daily completions table
CREATE TABLE public.daily_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, date)
);

ALTER TABLE public.daily_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.daily_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.daily_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own completions" ON public.daily_completions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.daily_completions FOR DELETE USING (auth.uid() = user_id);

-- Insert preset challenges
INSERT INTO public.challenges (title, description, category, icon, is_preset, user_id) VALUES
  ('Wasser trinken', 'Trink über den Tag verteilt ausreichend Wasser.', 'Gesundheit', '💧', true, null),
  ('Zähne putzen', 'Morgens und abends gründlich Zähne putzen.', 'Gesundheit', '🪥', true, null),
  ('Sport machen', 'Mindestens 30 Minuten Bewegung am Tag.', 'Fitness', '🏃', true, null),
  ('Gesund essen', 'Achte auf eine ausgewogene Ernährung.', 'Gesundheit', '🥗', true, null),
  ('Yoga machen', 'Eine Yoga-Session für Körper und Geist.', 'Fitness', '🧘', true, null),
  ('Meditieren', '10 Minuten Stille und Achtsamkeit.', 'Achtsamkeit', '🧠', true, null),
  ('Früh aufstehen', 'Stehe vor 7 Uhr auf.', 'Routine', '⏰', true, null),
  ('Tagebuch schreiben', 'Schreibe deine Gedanken auf.', 'Achtsamkeit', '📝', true, null);
