
-- ============================================
-- Harden all RLS policies: change FROM public TO authenticated
-- This ensures only logged-in users can access data
-- ============================================

-- Helper: For each table with {public} policies, drop and recreate with {authenticated}

-- ===== video_clips =====
DROP POLICY IF EXISTS "Users can delete their own clips" ON public.video_clips;
DROP POLICY IF EXISTS "Users can insert their own clips" ON public.video_clips;
DROP POLICY IF EXISTS "Users can update their own clips" ON public.video_clips;
DROP POLICY IF EXISTS "Users can view their own clips" ON public.video_clips;

CREATE POLICY "Users can delete their own clips" ON public.video_clips FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clips" ON public.video_clips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clips" ON public.video_clips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own clips" ON public.video_clips FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== cameras =====
DROP POLICY IF EXISTS "Users can delete their own cameras" ON public.cameras;
DROP POLICY IF EXISTS "Users can insert their own cameras" ON public.cameras;
DROP POLICY IF EXISTS "Users can update their own cameras" ON public.cameras;
DROP POLICY IF EXISTS "Users can view their own cameras" ON public.cameras;

CREATE POLICY "Users can delete their own cameras" ON public.cameras FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cameras" ON public.cameras FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cameras" ON public.cameras FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own cameras" ON public.cameras FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== stream_recordings =====
DROP POLICY IF EXISTS "Users can delete their own stream recordings" ON public.stream_recordings;
DROP POLICY IF EXISTS "Users can insert their own stream recordings" ON public.stream_recordings;
DROP POLICY IF EXISTS "Users can update their own stream recordings" ON public.stream_recordings;
DROP POLICY IF EXISTS "Users can view their own stream recordings" ON public.stream_recordings;

CREATE POLICY "Users can delete their own stream recordings" ON public.stream_recordings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stream recordings" ON public.stream_recordings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stream recordings" ON public.stream_recordings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own stream recordings" ON public.stream_recordings FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== rule_executions =====
DROP POLICY IF EXISTS "Users can delete their own rule executions" ON public.rule_executions;
DROP POLICY IF EXISTS "Users can insert their own rule executions" ON public.rule_executions;
DROP POLICY IF EXISTS "Users can update their own rule executions" ON public.rule_executions;
DROP POLICY IF EXISTS "Users can view their own rule executions" ON public.rule_executions;

CREATE POLICY "Users can delete their own rule executions" ON public.rule_executions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rule executions" ON public.rule_executions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rule executions" ON public.rule_executions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own rule executions" ON public.rule_executions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== zones =====
DROP POLICY IF EXISTS "Users can delete their own zones" ON public.zones;
DROP POLICY IF EXISTS "Users can insert their own zones" ON public.zones;
DROP POLICY IF EXISTS "Users can update their own zones" ON public.zones;
DROP POLICY IF EXISTS "Users can view their own zones" ON public.zones;

CREATE POLICY "Users can delete their own zones" ON public.zones FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own zones" ON public.zones FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own zones" ON public.zones FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own zones" ON public.zones FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== analysis_history =====
DROP POLICY IF EXISTS "Users can delete their own analysis" ON public.analysis_history;
DROP POLICY IF EXISTS "Users can insert their own analysis" ON public.analysis_history;
DROP POLICY IF EXISTS "Users can update their own analysis history" ON public.analysis_history;
DROP POLICY IF EXISTS "Users can view their own analysis" ON public.analysis_history;

CREATE POLICY "Users can delete their own analysis" ON public.analysis_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analysis" ON public.analysis_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own analysis history" ON public.analysis_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own analysis" ON public.analysis_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== recognition_logs =====
DROP POLICY IF EXISTS "Users can delete their own recognition logs" ON public.recognition_logs;
DROP POLICY IF EXISTS "Users can insert their own recognition logs" ON public.recognition_logs;
DROP POLICY IF EXISTS "Users can update their own recognition logs" ON public.recognition_logs;
DROP POLICY IF EXISTS "Users can view their own recognition logs" ON public.recognition_logs;

CREATE POLICY "Users can delete their own recognition logs" ON public.recognition_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recognition logs" ON public.recognition_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recognition logs" ON public.recognition_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own recognition logs" ON public.recognition_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== zone_events =====
DROP POLICY IF EXISTS "Users can delete their own zone events" ON public.zone_events;
DROP POLICY IF EXISTS "Users can insert their own zone events" ON public.zone_events;
DROP POLICY IF EXISTS "Users can update their own zone events" ON public.zone_events;
DROP POLICY IF EXISTS "Users can view their own zone events" ON public.zone_events;

CREATE POLICY "Users can delete their own zone events" ON public.zone_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own zone events" ON public.zone_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own zone events" ON public.zone_events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own zone events" ON public.zone_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== vehicles =====
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;

CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== face_recognition_configs =====
DROP POLICY IF EXISTS "Users can delete their own face recognition configs" ON public.face_recognition_configs;
DROP POLICY IF EXISTS "Users can insert their own face recognition configs" ON public.face_recognition_configs;
DROP POLICY IF EXISTS "Users can update their own face recognition configs" ON public.face_recognition_configs;
DROP POLICY IF EXISTS "Users can view their own face recognition configs" ON public.face_recognition_configs;

CREATE POLICY "Users can delete their own face recognition configs" ON public.face_recognition_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own face recognition configs" ON public.face_recognition_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own face recognition configs" ON public.face_recognition_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own face recognition configs" ON public.face_recognition_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== profiles =====
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== alerts =====
DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.alerts;

CREATE POLICY "Users can delete their own alerts" ON public.alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== heatmap_snapshots =====
DROP POLICY IF EXISTS "Users can delete their own heatmap snapshots" ON public.heatmap_snapshots;
DROP POLICY IF EXISTS "Users can insert their own heatmap snapshots" ON public.heatmap_snapshots;
DROP POLICY IF EXISTS "Users can view their own heatmap snapshots" ON public.heatmap_snapshots;

CREATE POLICY "Users can delete their own heatmap snapshots" ON public.heatmap_snapshots FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own heatmap snapshots" ON public.heatmap_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own heatmap snapshots" ON public.heatmap_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== arm_disarm_states =====
DROP POLICY IF EXISTS "Users can delete their own arm_disarm_states" ON public.arm_disarm_states;
DROP POLICY IF EXISTS "Users can insert their own arm_disarm_states" ON public.arm_disarm_states;
DROP POLICY IF EXISTS "Users can update their own arm_disarm_states" ON public.arm_disarm_states;
DROP POLICY IF EXISTS "Users can view their own arm_disarm_states" ON public.arm_disarm_states;

CREATE POLICY "Users can delete their own arm_disarm_states" ON public.arm_disarm_states FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own arm_disarm_states" ON public.arm_disarm_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own arm_disarm_states" ON public.arm_disarm_states FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own arm_disarm_states" ON public.arm_disarm_states FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== plate_detections =====
DROP POLICY IF EXISTS "Users can delete their own plate detections" ON public.plate_detections;
DROP POLICY IF EXISTS "Users can insert their own plate detections" ON public.plate_detections;
DROP POLICY IF EXISTS "Users can update their own plate detections" ON public.plate_detections;
DROP POLICY IF EXISTS "Users can view their own plate detections" ON public.plate_detections;

CREATE POLICY "Users can delete their own plate detections" ON public.plate_detections FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plate detections" ON public.plate_detections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plate detections" ON public.plate_detections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own plate detections" ON public.plate_detections FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== notification_configs =====
DROP POLICY IF EXISTS "Users can delete their own notification configs" ON public.notification_configs;
DROP POLICY IF EXISTS "Users can insert their own notification configs" ON public.notification_configs;
DROP POLICY IF EXISTS "Users can update their own notification configs" ON public.notification_configs;
DROP POLICY IF EXISTS "Users can view their own notification configs" ON public.notification_configs;

CREATE POLICY "Users can delete their own notification configs" ON public.notification_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notification configs" ON public.notification_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification configs" ON public.notification_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own notification configs" ON public.notification_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== panic_events =====
DROP POLICY IF EXISTS "Users can delete their own panic events" ON public.panic_events;
DROP POLICY IF EXISTS "Users can insert their own panic events" ON public.panic_events;
DROP POLICY IF EXISTS "Users can update their own panic events" ON public.panic_events;
DROP POLICY IF EXISTS "Users can view their own panic events" ON public.panic_events;

CREATE POLICY "Users can delete their own panic events" ON public.panic_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own panic events" ON public.panic_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own panic events" ON public.panic_events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own panic events" ON public.panic_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== registered_persons =====
DROP POLICY IF EXISTS "Users can delete their own persons" ON public.registered_persons;
DROP POLICY IF EXISTS "Users can insert their own persons" ON public.registered_persons;
DROP POLICY IF EXISTS "Users can update their own persons" ON public.registered_persons;
DROP POLICY IF EXISTS "Users can view their own persons" ON public.registered_persons;

CREATE POLICY "Users can delete their own persons" ON public.registered_persons FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own persons" ON public.registered_persons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own persons" ON public.registered_persons FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own persons" ON public.registered_persons FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== registered_plates =====
DROP POLICY IF EXISTS "Users can delete their own plates" ON public.registered_plates;
DROP POLICY IF EXISTS "Users can insert their own plates" ON public.registered_plates;
DROP POLICY IF EXISTS "Users can update their own plates" ON public.registered_plates;
DROP POLICY IF EXISTS "Users can view their own plates" ON public.registered_plates;

CREATE POLICY "Users can delete their own plates" ON public.registered_plates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plates" ON public.registered_plates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plates" ON public.registered_plates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own plates" ON public.registered_plates FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== recording_configs =====
DROP POLICY IF EXISTS "Users can delete their own recording configs" ON public.recording_configs;
DROP POLICY IF EXISTS "Users can insert their own recording configs" ON public.recording_configs;
DROP POLICY IF EXISTS "Users can update their own recording configs" ON public.recording_configs;
DROP POLICY IF EXISTS "Users can view their own recording configs" ON public.recording_configs;

CREATE POLICY "Users can delete their own recording configs" ON public.recording_configs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recording configs" ON public.recording_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recording configs" ON public.recording_configs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own recording configs" ON public.recording_configs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== rules =====
DROP POLICY IF EXISTS "Users can delete their own rules" ON public.rules;
DROP POLICY IF EXISTS "Users can insert their own rules" ON public.rules;
DROP POLICY IF EXISTS "Users can update their own rules" ON public.rules;
DROP POLICY IF EXISTS "Users can view their own rules" ON public.rules;

CREATE POLICY "Users can delete their own rules" ON public.rules FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rules" ON public.rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rules" ON public.rules FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own rules" ON public.rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
