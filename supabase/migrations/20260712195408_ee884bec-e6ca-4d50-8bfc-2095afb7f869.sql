
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON public.alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_user_created ON public.recognition_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_events_user_created ON public.panic_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detection_reviews_user_created ON public.detection_reviews (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plate_detections_user_created ON public.plate_detections (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_events_user_created ON public.zone_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_created ON public.rule_executions (user_id, created_at DESC);
