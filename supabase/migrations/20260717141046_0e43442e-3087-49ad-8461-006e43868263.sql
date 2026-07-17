CREATE OR REPLACE FUNCTION public.terminate_db_session(
  _pid integer,
  _force boolean DEFAULT false,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target record;
  action_taken text;
  success boolean;
  min_runtime_secs int := 30;
  min_idle_tx_secs int := 60;
  runtime_secs numeric;
  caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  IF _pid IS NULL OR _pid <= 0 THEN
    RAISE EXCEPTION 'PID inválido' USING ERRCODE = '22023';
  END IF;

  -- Não permitir suicídio
  IF _pid = pg_backend_pid() THEN
    RAISE EXCEPTION 'Não é possível encerrar a própria sessão' USING ERRCODE = '22023';
  END IF;

  SELECT
    a.pid, a.usename::text AS usename, a.application_name::text AS application_name,
    a.state::text AS state, a.backend_type::text AS backend_type,
    a.query_start, a.state_change,
    ROUND(EXTRACT(EPOCH FROM (now() - a.query_start))::numeric, 1) AS runtime_secs,
    LEFT(a.query, 500)::text AS query
  INTO target
  FROM pg_stat_activity a
  WHERE a.pid = _pid;

  IF target IS NULL THEN
    RAISE EXCEPTION 'PID % não encontrado', _pid USING ERRCODE = '02000';
  END IF;

  -- Proteção contra processos de sistema
  IF target.backend_type IS NULL OR target.backend_type <> 'client backend' THEN
    RAISE EXCEPTION 'Proibido encerrar backend_type=%: apenas sessões de cliente', target.backend_type
      USING ERRCODE = '42501';
  END IF;

  IF target.usename IN (
    'postgres', 'supabase_admin', 'supabase_auth_admin',
    'supabase_storage_admin', 'supabase_replication_admin', 'pgbouncer'
  ) OR target.usename IS NULL THEN
    RAISE EXCEPTION 'Proibido encerrar sessão do usuário de sistema: %', target.usename
      USING ERRCODE = '42501';
  END IF;

  runtime_secs := COALESCE(target.runtime_secs, 0);

  -- Validar duração mínima (evita kill de queries legítimas curtas)
  IF target.state = 'active' AND runtime_secs < min_runtime_secs THEN
    RAISE EXCEPTION 'Sessão ativa há apenas %s (mínimo %s). Aguarde ou use _force=true.',
      runtime_secs || 's', min_runtime_secs || 's'
      USING ERRCODE = '55000';
  END IF;

  IF target.state = 'idle in transaction' AND runtime_secs < min_idle_tx_secs THEN
    RAISE EXCEPTION 'Idle in transaction há apenas %s (mínimo %s). Aguarde ou use _force=true.',
      runtime_secs || 's', min_idle_tx_secs || 's'
      USING ERRCODE = '55000';
  END IF;

  IF target.state = 'idle' AND NOT _force THEN
    RAISE EXCEPTION 'Sessão apenas idle (sem query em andamento). Use _force=true se realmente deseja terminar.'
      USING ERRCODE = '55000';
  END IF;

  -- Ação: cancel primeiro; terminate somente se _force
  IF _force THEN
    action_taken := 'pg_terminate_backend';
    SELECT pg_terminate_backend(_pid) INTO success;
  ELSE
    action_taken := 'pg_cancel_backend';
    SELECT pg_cancel_backend(_pid) INTO success;
  END IF;

  -- Auditoria (sempre, mesmo se signal falhou)
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, severity, new_values)
  VALUES (
    caller,
    'admin.' || action_taken,
    'pg_stat_activity',
    gen_random_uuid(),
    CASE WHEN _force THEN 'high' ELSE 'medium' END,
    jsonb_build_object(
      'pid', _pid,
      'target_user', target.usename,
      'application', target.application_name,
      'state', target.state,
      'runtime_secs', runtime_secs,
      'query_preview', target.query,
      'action', action_taken,
      'signal_success', success,
      'reason', _reason
    )
  );

  RETURN jsonb_build_object(
    'ok', success,
    'action', action_taken,
    'pid', _pid,
    'target_user', target.usename,
    'state_before', target.state,
    'runtime_secs', runtime_secs,
    'query_preview', target.query,
    'audited', true,
    'ran_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.terminate_db_session(integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terminate_db_session(integer, boolean, text) TO authenticated, service_role;