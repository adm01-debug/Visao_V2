-- Índice parcial: acelera contagem/listagem de alertas não lidos por usuário (queries mais frequentes do dashboard)
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread
  ON public.alerts (user_id, created_at DESC)
  WHERE is_read = false;

-- Índice por severidade para filtros do dashboard
CREATE INDEX IF NOT EXISTS idx_alerts_user_severity_created
  ON public.alerts (user_id, severity, created_at DESC);

-- Índice para queries por câmera (usado em drill-down)
CREATE INDEX IF NOT EXISTS idx_alerts_camera_created
  ON public.alerts (camera_id, created_at DESC);