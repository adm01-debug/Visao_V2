
DO $$
BEGIN
  -- Only drop if table is in the publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.alerts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'analysis_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.analysis_history;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'recognition_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.recognition_logs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vehicles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.vehicles;
  END IF;
END $$;
