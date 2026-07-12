CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created
  ON public.audit_logs (entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id
  ON public.audit_logs (entity_id)
  WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON public.audit_logs (action, created_at DESC);

ANALYZE public.audit_logs;
ANALYZE public.alerts;
ANALYZE public.panic_events;
ANALYZE public.zone_events;
ANALYZE public.rule_executions;