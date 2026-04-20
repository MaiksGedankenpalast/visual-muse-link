-- Add quantity columns to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS default_target numeric,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS is_quantifiable boolean NOT NULL DEFAULT true;

-- Add quantity columns to daily_completions (the existing logs table)
ALTER TABLE public.daily_completions
  ADD COLUMN IF NOT EXISTS target_value numeric,
  ADD COLUMN IF NOT EXISTS logged_value numeric;

-- Seed sensible defaults for existing preset challenges based on title keywords
UPDATE public.challenges SET default_target = 8, unit = 'Gläser', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%wasser%' OR title ILIKE '%glas%' OR title ILIKE '%water%');

UPDATE public.challenges SET default_target = 10, unit = 'Minuten', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%spazier%' OR title ILIKE '%walk%' OR title ILIKE '%gehen%' OR title ILIKE '%bewegung%');

UPDATE public.challenges SET default_target = 5, unit = 'Minuten', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%atem%' OR title ILIKE '%breathing%' OR title ILIKE '%meditation%' OR title ILIKE '%achtsam%');

UPDATE public.challenges SET default_target = 3, unit = 'Dinge', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%dankbar%' OR title ILIKE '%gratitude%');

UPDATE public.challenges SET default_target = 10, unit = 'Minuten', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%journal%' OR title ILIKE '%schreib%' OR title ILIKE '%tagebuch%');

UPDATE public.challenges SET default_target = 15, unit = 'Minuten', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%lesen%' OR title ILIKE '%buch%' OR title ILIKE '%read%');

UPDATE public.challenges SET default_target = 20, unit = 'Minuten', is_quantifiable = true
  WHERE is_preset = true AND (title ILIKE '%sport%' OR title ILIKE '%yoga%' OR title ILIKE '%workout%' OR title ILIKE '%dehn%');

UPDATE public.challenges SET default_target = 1, unit = 'Mal', is_quantifiable = true
  WHERE is_preset = true AND default_target IS NULL AND is_quantifiable = true
  AND (title ILIKE '%anruf%' OR title ILIKE '%freund%' OR title ILIKE '%kontakt%' OR title ILIKE '%nachricht%');

-- Mark common binary challenges as non-quantifiable
UPDATE public.challenges SET is_quantifiable = false, default_target = NULL, unit = NULL
  WHERE is_preset = true AND (
    title ILIKE '%kein%' OR title ILIKE '%no %' OR title ILIKE '%verzicht%'
    OR title ILIKE '%vor 10%' OR title ILIKE '%before 10%'
    OR title ILIKE '%kein handy%' OR title ILIKE '%kein social%'
    OR title ILIKE '%bildschirm%' OR title ILIKE '%screen%'
  );

-- Fallback: any remaining quantifiable preset without a target gets a sensible default
UPDATE public.challenges SET default_target = 1, unit = 'Mal'
  WHERE is_preset = true AND is_quantifiable = true AND default_target IS NULL;

-- Backfill target_value on existing logs from the parent challenge
UPDATE public.daily_completions dc
  SET target_value = c.default_target
  FROM public.challenges c
  WHERE dc.challenge_id = c.id
    AND dc.target_value IS NULL
    AND c.default_target IS NOT NULL;

-- Backfill logged_value from existing status
UPDATE public.daily_completions
  SET logged_value = COALESCE(target_value, 1)
  WHERE logged_value IS NULL AND status = 'completed';

UPDATE public.daily_completions
  SET logged_value = 0
  WHERE logged_value IS NULL AND status IN ('missed', 'pending');

UPDATE public.daily_completions
  SET logged_value = ROUND(COALESCE(target_value, 1) / 2)
  WHERE logged_value IS NULL AND status = 'partial';