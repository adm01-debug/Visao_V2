-- Onda 103: fechar leituras globais e enumeração cross-tenant em funções SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.envelope_encryption_stats()
RETURNS TABLE(total bigint, enveloped bigint, legacy bigint, by_kek_version jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Métrica global: somente administradores (service_role tem auth.uid() nulo).
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.camera_credentials),
    (SELECT COUNT(*) FROM public.camera_credentials WHERE dek_wrapped IS NOT NULL),
    (SELECT COUNT(*) FROM public.camera_credentials WHERE encrypted_password IS NOT NULL AND dek_wrapped IS NULL),
    COALESCE(
      (SELECT jsonb_object_agg(COALESCE(kek_version::TEXT, 'null'), c)
         FROM (SELECT kek_version, COUNT(*)::INT AS c FROM public.camera_credentials
                WHERE dek_wrapped IS NOT NULL GROUP BY kek_version) t),
      '{}'::jsonb
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cron_watchdog_consecutive_problems(_min_runs integer DEFAULT 3)
RETURNS TABLE(consecutive_problem_runs integer, last_run_at timestamp with time zone, total_problems integer, distinct_jobs integer, jobnames text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_last timestamptz;
  v_total integer := 0;
  v_jobs text[] := ARRAY[]::text[];
  r record;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT ran_at, problems, details
    FROM public.cron_watchdog_runs
    ORDER BY ran_at DESC
    LIMIT GREATEST(_min_runs * 2, 10)
  LOOP
    IF v_last IS NULL THEN v_last := r.ran_at; END IF;
    IF r.problems > 0 THEN
      v_count := v_count + 1;
      v_total := v_total + r.problems;
      SELECT array_agg(DISTINCT jn) INTO v_jobs
      FROM (
        SELECT unnest(v_jobs) AS jn
        UNION
        SELECT (d->>'jobname') FROM jsonb_array_elements(COALESCE(r.details, '[]'::jsonb)) d
      ) x
      WHERE jn IS NOT NULL;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_count, v_last, v_total,
    COALESCE(array_length(v_jobs, 1), 0),
    COALESCE(v_jobs, ARRAY[]::text[]);
END;
$function$;

CREATE OR REPLACE FUNCTION public.preview_success_alert(p_window_hours integer DEFAULT 1, p_min_events integer DEFAULT 50, p_threshold numeric DEFAULT 0.90)
RETURNS TABLE(window_hours integer, total_started bigint, total_failed bigint, total_relevant bigint, success_rate numeric, threshold_used numeric, should_alert boolean, generated_at timestamp with time zone)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s BIGINT := 0;
  f BIGINT := 0;
  r BIGINT := 0;
  rate NUMERIC := NULL;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN event_type = 'started' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'failed'  THEN 1 ELSE 0 END), 0)
    INTO s, f
    FROM public.preview_telemetry_events
   WHERE created_at >= now() - make_interval(hours => p_window_hours);

  r := s + f;
  IF r > 0 THEN rate := s::NUMERIC / r::NUMERIC; END IF;

  RETURN QUERY SELECT
    p_window_hours, s, f, r, rate, p_threshold,
    (r >= p_min_events AND rate IS NOT NULL AND rate < p_threshold),
    now();
END;
$function$;

-- Escopo obrigatório ao próprio usuário quando há sessão JWT.
CREATE OR REPLACE FUNCTION public.is_test_mode_active(_user_id uuid, _camera_id uuid DEFAULT NULL::uuid, _rule_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.test_mode_sessions
    WHERE user_id = _user_id
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
      AND ended_at IS NULL
      AND expires_at > now()
      AND (
        scope = 'all'
        OR (scope = 'camera' AND _camera_id IS NOT NULL AND _camera_id = ANY(scope_ids))
        OR (scope = 'rule'   AND _rule_id   IS NOT NULL AND _rule_id   = ANY(scope_ids))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.resolve_schedule_cameras(_user_id uuid, _scope text, _camera_id uuid, _group_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT c.id FROM public.cameras c
  WHERE c.user_id = _user_id
    AND (auth.uid() IS NULL OR _user_id = auth.uid())
    AND (
      (_scope = 'all')
      OR (_scope = 'camera' AND c.id = _camera_id)
      OR (_scope = 'group' AND c.id IN (
        SELECT mgc.camera_id FROM public.monitor_group_cameras mgc
        WHERE mgc.group_id = _group_id AND mgc.user_id = _user_id
      ))
    )
$function$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
REVOKE ALL ON FUNCTION public.preview_success_alert(integer, integer, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cron_watchdog_consecutive_problems(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.envelope_encryption_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_test_mode_active(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_schedule_cameras(uuid, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_test_mode_active(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.envelope_encryption_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cron_watchdog_consecutive_problems(integer) TO authenticated;