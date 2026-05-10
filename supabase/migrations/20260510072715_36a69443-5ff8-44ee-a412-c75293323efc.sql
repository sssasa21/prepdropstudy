CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "public insert feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete feedback" ON public.feedback FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;