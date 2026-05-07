-- Resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "public insert resources" ON public.resources FOR INSERT WITH CHECK (true);
CREATE POLICY "public update resources" ON public.resources FOR UPDATE USING (true);
CREATE POLICY "public delete resources" ON public.resources FOR DELETE USING (true);
ALTER TABLE public.resources REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;

-- Claimed IDs
CREATE TABLE public.claimed_ids (
  user_id TEXT NOT NULL PRIMARY KEY,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.claimed_ids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read claimed_ids" ON public.claimed_ids FOR SELECT USING (true);
CREATE POLICY "public insert claimed_ids" ON public.claimed_ids FOR INSERT WITH CHECK (true);

-- Submission times
CREATE TABLE public.submission_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.submission_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read submission_times" ON public.submission_times FOR SELECT USING (true);
CREATE POLICY "public insert submission_times" ON public.submission_times FOR INSERT WITH CHECK (true);
CREATE INDEX idx_submission_times_user ON public.submission_times(user_id, submitted_at DESC);