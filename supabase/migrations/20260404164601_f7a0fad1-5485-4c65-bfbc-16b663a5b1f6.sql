
-- =============================================
-- 1. Make storage buckets private
-- =============================================
UPDATE storage.buckets SET public = false WHERE id IN ('person-photos', 'camera-thumbnails', 'heatmap-snapshots', 'recordings');

-- Drop overly permissive public SELECT policies and replace with authenticated-only
-- person-photos
DROP POLICY IF EXISTS "Person photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read person-photos" ON storage.objects;
CREATE POLICY "Authenticated users can view person-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'person-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- camera-thumbnails
DROP POLICY IF EXISTS "Camera thumbnails are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read camera-thumbnails" ON storage.objects;
CREATE POLICY "Authenticated users can view camera-thumbnails"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'camera-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- heatmap-snapshots
DROP POLICY IF EXISTS "Heatmap snapshots are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read heatmap-snapshots" ON storage.objects;
CREATE POLICY "Authenticated users can view heatmap-snapshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'heatmap-snapshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- recordings
DROP POLICY IF EXISTS "Recordings are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read recordings" ON storage.objects;
CREATE POLICY "Authenticated users can view recordings"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- 2. Create indexes on user_id for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_arm_disarm_states_user_id ON public.arm_disarm_states(user_id);
CREATE INDEX IF NOT EXISTS idx_cameras_user_id ON public.cameras(user_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_configs_user_id ON public.face_recognition_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_snapshots_user_id ON public.heatmap_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_user_id ON public.notification_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_events_user_id ON public.panic_events(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_detections_user_id ON public.plate_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_query_telemetry_user_id ON public.query_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_user_id ON public.recognition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_configs_user_id ON public.recording_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_registered_persons_user_id ON public.registered_persons(user_id);
CREATE INDEX IF NOT EXISTS idx_registered_plates_user_id ON public.registered_plates(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_id ON public.rule_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON public.rules(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_recordings_user_id ON public.stream_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_user_id ON public.video_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_events_user_id ON public.zone_events(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON public.zones(user_id);

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON public.alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_user_timestamp ON public.recognition_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_plate_detections_user_timestamp ON public.plate_detections(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_zone_events_user_timestamp ON public.zone_events(user_id, timestamp DESC);
