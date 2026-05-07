ALTER TABLE public.claimed_ids REPLICA IDENTITY FULL;
ALTER TABLE public.resources REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.claimed_ids;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;