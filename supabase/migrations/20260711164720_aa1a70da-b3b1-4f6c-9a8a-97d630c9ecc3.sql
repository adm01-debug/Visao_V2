-- Composite indexes for user-scoped, time-ordered feeds
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_events_user_created ON public.panic_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_clips_user_created ON public.video_clips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_recordings_user_created ON public.stream_recordings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_created ON public.analysis_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_executions_user_triggered ON public.rule_executions (user_id, triggered_at DESC);