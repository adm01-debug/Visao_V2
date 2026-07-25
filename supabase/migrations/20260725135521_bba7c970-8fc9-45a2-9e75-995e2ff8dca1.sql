DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.camera_health_state; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.camera_health_state REPLICA IDENTITY FULL;