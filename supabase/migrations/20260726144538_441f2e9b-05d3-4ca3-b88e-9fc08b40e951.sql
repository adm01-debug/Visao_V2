-- Onda 100: cobertura de índices em chaves estrangeiras sem índice no lado filho.
-- Evita seq scan nos gatilhos de integridade referencial em DELETE/UPDATE do pai.
-- Colunas anuláveis esparsas usam índice parcial para reduzir write amplification.

CREATE INDEX IF NOT EXISTS idx_camera_connectivity_preferences_relay_agent_id
  ON public.camera_connectivity_preferences (relay_agent_id) WHERE relay_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_camera_connectivity_preferences_user_id
  ON public.camera_connectivity_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_camera_patrol_stops_preset_id
  ON public.camera_patrol_stops (preset_id);

CREATE INDEX IF NOT EXISTS idx_camera_schedules_camera_id
  ON public.camera_schedules (camera_id) WHERE camera_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_camera_schedules_group_id
  ON public.camera_schedules (group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_connectivity_resolution_telemetry_camera_id
  ON public.connectivity_resolution_telemetry (camera_id);
CREATE INDEX IF NOT EXISTS idx_connectivity_resolution_telemetry_relay_agent_id
  ON public.connectivity_resolution_telemetry (relay_agent_id) WHERE relay_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cron_watchdog_escalations_acknowledged_by
  ON public.cron_watchdog_escalations (acknowledged_by) WHERE acknowledged_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monitor_group_cameras_camera_id
  ON public.monitor_group_cameras (camera_id);

CREATE INDEX IF NOT EXISTS idx_notification_dispatches_recipient_id
  ON public.notification_dispatches (recipient_id) WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ptz_connection_attempts_relay_agent_id
  ON public.ptz_connection_attempts (relay_agent_id) WHERE relay_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_mode_sessions_created_by
  ON public.test_mode_sessions (created_by);

CREATE INDEX IF NOT EXISTS idx_timelapse_configs_camera_id
  ON public.timelapse_configs (camera_id);
CREATE INDEX IF NOT EXISTS idx_timelapse_snapshots_camera_id
  ON public.timelapse_snapshots (camera_id);
CREATE INDEX IF NOT EXISTS idx_timelapse_videos_camera_id
  ON public.timelapse_videos (camera_id);