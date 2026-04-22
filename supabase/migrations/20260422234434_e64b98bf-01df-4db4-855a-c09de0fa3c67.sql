-- Create moments table
CREATE TABLE public.moments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  prompt_used TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast calendar lookups
CREATE INDEX idx_moments_user_date ON public.moments(user_id, date);

-- Enable RLS
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moments"
ON public.moments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moments"
ON public.moments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moments"
ON public.moments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own moments"
ON public.moments FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('moment-photos', 'moment-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: each user can only access files in their own folder ({user_id}/...)
CREATE POLICY "Users can view own moment photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'moment-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own moment photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moment-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own moment photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moment-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own moment photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moment-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);