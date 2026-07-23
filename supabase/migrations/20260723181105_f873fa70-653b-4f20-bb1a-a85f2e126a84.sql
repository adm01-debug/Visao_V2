ALTER TABLE public.cameras REPLICA IDENTITY FULL;
ALTER TABLE public.camera_events REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cameras; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;