CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (resource_id, user_id)
);

CREATE INDEX idx_ratings_resource ON public.ratings(resource_id);
CREATE INDEX idx_ratings_user ON public.ratings(user_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "public insert ratings" ON public.ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "public update ratings" ON public.ratings FOR UPDATE USING (true);
CREATE POLICY "public delete ratings" ON public.ratings FOR DELETE USING (true);

ALTER TABLE public.ratings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ratings;
