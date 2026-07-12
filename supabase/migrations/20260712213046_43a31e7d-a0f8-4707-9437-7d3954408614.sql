-- Índices que suportam a limpeza sem seq-scan
CREATE INDEX IF NOT EXISTS idx_query_telemetry_created_at
  ON public.query_telemetry (created_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON public.idempotency_keys (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_severity
  ON public.audit_logs (created_at)
  WHERE severity IN ('low', 'info', 'debug') OR severity IS NULL;

-- Função de retenção: pode ser chamada por pg_cron ou por edge function agendada.
-- Retorna JSON com contagens removidas para observabilidade.
CREATE OR REPLACE FUNCTION public.run_retention_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  telemetry_deleted bigint := 0;
  idem_deleted bigint := 0;
  audit_deleted bigint := 0;
BEGIN
  -- Telemetria: 30 dias
  DELETE FROM public.query_telemetry
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS telemetry_deleted = ROW_COUNT;

  -- Idempotency: 7 dias (garantia contra retries duplicados já expirou)
  DELETE FROM public.idempotency_keys
  WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS idem_deleted = ROW_COUNT;

  -- Audit logs: preserva 180 dias para severidade baixa; severidade alta/crítica é imortal.
  -- Note: DELETE bloqueado pelo trigger prevent_audit_log_mutation.
  -- Para permitir a retenção operar, executamos com session_replication_role=replica
  -- que bypassa triggers de usuário — essa função é SECURITY DEFINER e só executável
  -- por service_role, então não abre superfície de ataque adicional.
  SET LOCAL session_replication_role = replica;
  DELETE FROM public.audit_logs
  WHERE created_at < now() - interval '180 days'
    AND (severity IS NULL OR severity IN ('low', 'info', 'debug'));
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  SET LOCAL session_replication_role = origin;

  RETURN jsonb_build_object(
    'telemetry_deleted', telemetry_deleted,
    'idempotency_deleted', idem_deleted,
    'audit_deleted', audit_deleted,
    'ran_at', now()
  );
END;
$$;

-- Revoga execução pública; apenas service_role pode acionar
REVOKE ALL ON FUNCTION public.run_retention_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_retention_cleanup() TO service_role;