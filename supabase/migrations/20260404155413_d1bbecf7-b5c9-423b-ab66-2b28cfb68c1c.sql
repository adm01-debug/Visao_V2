
-- ============================================
-- 1. Make sensitive storage buckets PRIVATE
-- ============================================
UPDATE storage.buckets SET public = false WHERE id IN ('person-photos', 'recordings', 'heatmap-snapshots', 'camera-thumbnails');

-- ============================================
-- 2. Drop ALL existing storage policies for these buckets to rebuild them securely
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can upload person photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view person photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their person photos" ON storage.objects;
DROP POLICY IF EXISTS "person-photos_select" ON storage.objects;
DROP POLICY IF EXISTS "person-photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "person-photos_delete" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their recordings" ON storage.objects;
DROP POLICY IF EXISTS "recordings_select" ON storage.objects;
DROP POLICY IF EXISTS "recordings_insert" ON storage.objects;
DROP POLICY IF EXISTS "recordings_delete" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload heatmap snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view heatmap snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their heatmap snapshots" ON storage.objects;
DROP POLICY IF EXISTS "heatmap-snapshots_select" ON storage.objects;
DROP POLICY IF EXISTS "heatmap-snapshots_insert" ON storage.objects;
DROP POLICY IF EXISTS "heatmap-snapshots_delete" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload camera thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view camera thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their camera thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "camera-thumbnails_select" ON storage.objects;
DROP POLICY IF EXISTS "camera-thumbnails_insert" ON storage.objects;
DROP POLICY IF EXISTS "camera-thumbnails_delete" ON storage.objects;

-- ============================================
-- 3. Create secure policies scoped to user ownership
-- ============================================

-- person-photos: SELECT only own files
CREATE POLICY "person_photos_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- person-photos: INSERT only own folder
CREATE POLICY "person_photos_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- person-photos: DELETE only own files
CREATE POLICY "person_photos_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- recordings: SELECT own
CREATE POLICY "recordings_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- recordings: INSERT own
CREATE POLICY "recordings_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- recordings: DELETE own
CREATE POLICY "recordings_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- heatmap-snapshots: SELECT own
CREATE POLICY "heatmap_snapshots_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- heatmap-snapshots: INSERT own
CREATE POLICY "heatmap_snapshots_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- heatmap-snapshots: DELETE own
CREATE POLICY "heatmap_snapshots_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- camera-thumbnails: SELECT own
CREATE POLICY "camera_thumbnails_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- camera-thumbnails: INSERT own
CREATE POLICY "camera_thumbnails_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- camera-thumbnails: DELETE own
CREATE POLICY "camera_thumbnails_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 4. Performance indexes on user_id columns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_cameras_user_id ON public.cameras(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_user_id ON public.recognition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_registered_persons_user_id ON public.registered_persons(user_id);
CREATE INDEX IF NOT EXISTS idx_registered_plates_user_id ON public.registered_plates(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_detections_user_id ON public.plate_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_zones_user_id ON public.zones(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_events_user_id ON public.zone_events(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON public.rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_id ON public.rule_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_snapshots_user_id ON public.heatmap_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_recordings_user_id ON public.stream_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_configs_user_id ON public.recording_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_configs_user_id ON public.notification_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_user_id ON public.video_clips(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_arm_disarm_states_user_id ON public.arm_disarm_states(user_id);
CREATE INDEX IF NOT EXISTS idx_panic_events_user_id ON public.panic_events(user_id);
CREATE INDEX IF NOT EXISTS idx_face_recognition_configs_user_id ON public.face_recognition_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON public.alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_user_timestamp ON public.recognition_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_plate_detections_user_timestamp ON public.plate_detections(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_zone_events_zone_timestamp ON public.zone_events(zone_id, timestamp DESC);
