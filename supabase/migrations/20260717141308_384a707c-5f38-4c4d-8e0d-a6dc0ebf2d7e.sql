CREATE OR REPLACE FUNCTION public.get_connection_saturation()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  max_conn int;
  reserved int;
  total int;
  active int;
  idle int;
  idle_tx int;
  waiting int;
  by_app jsonb;
  by_user jsonb;
  suspects jsonb;
  saturation_pct numeric;
  severity text := 'ok';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT setting::int INTO max_conn FROM pg_settings WHERE name = 'max_connections';
  SELECT setting::int INTO reserved FROM pg_settings WHERE name = 'superuser_reserved_connections';

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE state = 'active')::int,
    COUNT(*) FILTER (WHERE state = 'idle')::int,
    COUNT(*) FILTER (WHERE state = 'idle in transaction')::int,
    COUNT(*) FILTER (WHERE wait_event IS NOT NULL AND state = 'active')::int
  INTO total, active, idle, idle_tx, waiting
  FROM pg_stat_activity
  WHERE backend_type = 'client backend';

  saturation_pct := CASE WHEN max_conn > 0
    THEN ROUND(100.0 * total::numeric / max_conn, 2)
    ELSE NULL END;

  severity := CASE
    WHEN saturation_pct >= 90 OR idle_tx >= 20 THEN 'critical'
    WHEN saturation_pct >= 75 OR idle_tx >= 10 THEN 'warning'
    WHEN saturation_pct >= 50 THEN 'info'
    ELSE 'ok'
  END;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.total DESC), '[]'::jsonb) INTO by_app FROM (
    SELECT
      COALESCE(NULLIF(application_name, ''), '(sem nome)') AS application_name,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE state = 'active')::int AS active,
      COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
      COUNT(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_tx,
      MAX(EXTRACT(EPOCH FROM (now() - state_change)))::int AS max_idle_secs
    FROM pg_stat_activity
    WHERE backend_type = 'client backend'
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 20
  ) a;

  SELECT COALESCE(jsonb_agg(row_to_json(u) ORDER BY u.total DESC), '[]'::jsonb) INTO by_user FROM (
    SELECT
      COALESCE(usename, '(nulo)') AS usename,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE state = 'active')::int AS active,
      COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
      COUNT(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_tx
    FROM pg_stat_activity
    WHERE backend_type = 'client backend'
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 20
  ) u;

  -- Suspeitos de leak: apps com muitas conexões idle antigas
  SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.idle_conns DESC), '[]'::jsonb) INTO suspects FROM (
    SELECT
      COALESCE(NULLIF(application_name, ''), '(sem nome)') AS application_name,
      COALESCE(usename, '(nulo)') AS usename,
      COUNT(*)::int AS idle_conns,
      MAX(EXTRACT(EPOCH FROM (now() - state_change)))::int AS oldest_idle_secs
    FROM pg_stat_activity
    WHERE backend_type = 'client backend'
      AND state IN ('idle', 'idle in transaction')
      AND state_change < now() - interval '5 minutes'
    GROUP BY 1, 2
    HAVING COUNT(*) >= 5
    ORDER BY 3 DESC
    LIMIT 10
  ) s;

  RETURN jsonb_build_object(
    'max_connections', max_conn,
    'superuser_reserved', reserved,
    'available', max_conn - reserved,
    'summary', jsonb_build_object(
      'total_clients', total,
      'active', active,
      'idle', idle,
      'idle_in_tx', idle_tx,
      'waiting_on_lock', waiting,
      'saturation_pct', saturation_pct,
      'severity', severity
    ),
    'by_application', by_app,
    'by_user', by_user,
    'leak_suspects', suspects,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_connection_saturation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_connection_saturation() TO authenticated, service_role;