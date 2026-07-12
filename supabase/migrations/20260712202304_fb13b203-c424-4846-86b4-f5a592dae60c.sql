-- panic_events: listar pânicos abertos rapidamente
CREATE INDEX IF NOT EXISTS idx_panic_events_user_unresolved
  ON public.panic_events (user_id, created_at DESC)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_panic_events_user_created
  ON public.panic_events (user_id, created_at DESC);

-- zone_events: histórico por usuário e drill-down por câmera
CREATE INDEX IF NOT EXISTS idx_zone_events_user_created
  ON public.zone_events (user_id, created_at DESC);

-- rule_executions: dashboards de regras (últimas execuções + falhas)
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule_triggered
  ON public.rule_executions (rule_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_rule_executions_user_triggered
  ON public.rule_executions (user_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_rule_executions_user_failed
  ON public.rule_executions (user_id, triggered_at DESC)
  WHERE status = 'failed';