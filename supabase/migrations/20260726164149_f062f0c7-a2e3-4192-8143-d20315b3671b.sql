CREATE OR REPLACE FUNCTION public.detect_camera_clock_skew(
  lookback_hours   integer DEFAULT 168,
  min_samples      integer DEFAULT 5,
  warn_seconds     integer DEFAULT 300,
  critical_seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t0            timestamptz := clock_timestamp();
  v_run_id      uuid;
  src           record;
  src_list      text[] := ARRAY[]::text[];
  future_edge   timestamptz;
  past_edge     timestamptz := make_timestamptz(2000, 1, 1, 0, 0, 0);
  inserted      integer := 0;
  n_warning     integer := 0;
  n_critical    integer := 0;
  n_total       integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'apenas administradores podem executar detect_camera_clock_skew';
  END IF;

  lookback_hours   := LEAST(GREATEST(COALESCE(lookback_hours, 168), 1), 8760);
  min_samples      := LEAST(GREATEST(COALESCE(min_samples, 5), 1), 10000);
  warn_seconds     := LEAST(GREATEST(COALESCE(warn_seconds, 300), 1), 86400);
  critical_seconds := LEAST(GREATEST(COALESCE(critical_seconds, 3600), warn_seconds + 1), 604800);

  future_edge := now() + interval '30 days';
  PERFORM set_config('statement_timeout', '90s', true);

  INSERT INTO public.camera_clock_skew_runs
    (lookback_hours, min_samples, warn_seconds, critical_seconds)
  VALUES (lookback_hours, min_samples, warn_seconds, critical_seconds)
  RETURNING id INTO v_run_id;

  FOR src IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'camera_id'  AND a.attnum > 0 AND NOT a.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'timestamp'  AND a.attnum > 0 AND NOT a.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'created_at' AND a.attnum > 0 AND NOT a.attisdropped)
      AND NOT EXISTS (SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid)
    ORDER BY c.relname
  LOOP
    src_list := array_append(src_list, src.tbl);

    EXECUTE format($fmt$
      INSERT INTO public.camera_clock_skew_findings
        (run_id, camera_id, user_id, source_table, severity, direction,
         sample_count, median_skew_seconds, max_abs_skew_seconds,
         sentinel_rows, suppressed, reason)
      SELECT
        %2$L::uuid,
        agg.camera_id,
        agg.user_id,
        %1$L,
        CASE
          WHEN agg.samples < %5$s AND agg.sentinel_rows = 0 THEN 'insufficient_data'
          WHEN agg.sentinel_rows > 0                        THEN 'critical'
          WHEN abs(agg.median_skew) >= %7$s                 THEN 'critical'
          WHEN abs(agg.median_skew) >= %6$s                 THEN 'warning'
          ELSE 'ok'
        END,
        CASE
          WHEN abs(agg.median_skew) < 1 THEN 'none'
          WHEN agg.median_skew > 0      THEN 'ahead'
          ELSE 'behind'
        END,
        agg.samples,
        round(agg.median_skew, 3),
        round(greatest(agg.max_abs_skew, abs(agg.median_skew)), 3),
        agg.sentinel_rows,
        CASE
          WHEN agg.samples < %5$s AND agg.sentinel_rows = 0 THEN true
          ELSE COALESCE(h.state, 'unknown') <> 'online'
        END,
        CASE
          WHEN agg.samples < %5$s AND agg.sentinel_rows = 0
            THEN 'apenas ' || agg.samples || ' amostra(s) na janela (mínimo %5$s)'
          WHEN agg.sentinel_rows > 0
            THEN agg.sentinel_rows || ' evento(s) com carimbo impossível — RTC provavelmente sem NTP'
          WHEN abs(agg.median_skew) >= %7$s
            THEN 'desvio mediano de ' || round(abs(agg.median_skew))::text || 's (limite crítico %7$ss)'
          WHEN abs(agg.median_skew) >= %6$s
            THEN 'desvio mediano de ' || round(abs(agg.median_skew))::text || 's (limite de atenção %6$ss)'
          ELSE 'relógio dentro da tolerância (' || round(abs(agg.median_skew))::text || 's)'
        END
      FROM (
        SELECT
          t.camera_id,
          (array_agg(t.user_id ORDER BY t.created_at DESC))[1] AS user_id,
          count(*)::int AS samples,
          COALESCE(percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (t."timestamp" - t.created_at))
          ), 0)::numeric AS median_skew,
          COALESCE(max(abs(EXTRACT(EPOCH FROM (t."timestamp" - t.created_at)))), 0)::numeric AS max_abs_skew,
          count(*) FILTER (WHERE t."timestamp" < %3$L OR t."timestamp" > %4$L)::int AS sentinel_rows
        FROM public.%1$I t
        WHERE t.camera_id IS NOT NULL
          AND t.created_at >= now() - make_interval(hours => %8$s)
        GROUP BY t.camera_id
      ) agg
      LEFT JOIN public.camera_health_state h ON h.camera_id = agg.camera_id
    $fmt$, src.tbl, v_run_id, past_edge, future_edge,
           min_samples, warn_seconds, critical_seconds, lookback_hours);

    GET DIAGNOSTICS inserted = ROW_COUNT;
    n_total := n_total + inserted;
  END LOOP;

  SELECT
    count(*) FILTER (WHERE f.severity = 'warning'),
    count(*) FILTER (WHERE f.severity = 'critical')
  INTO n_warning, n_critical
  FROM public.camera_clock_skew_findings f
  WHERE f.run_id = v_run_id;

  UPDATE public.camera_clock_skew_runs r
  SET duration_ms      = (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
      sources          = src_list,
      cameras_analyzed = n_total,
      cameras_warning  = n_warning,
      cameras_critical = n_critical,
      ok               = true
  WHERE r.id = v_run_id;

  DELETE FROM public.camera_clock_skew_runs WHERE ran_at < now() - interval '90 days';

  RETURN jsonb_build_object(
    'run_id',   v_run_id,
    'sources',  to_jsonb(src_list),
    'analyzed', n_total,
    'warning',  n_warning,
    'critical', n_critical
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.camera_clock_skew_runs
    (lookback_hours, min_samples, warn_seconds, critical_seconds,
     duration_ms, ok, error_detail)
  VALUES (lookback_hours, min_samples, warn_seconds, critical_seconds,
     (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int, false, left(SQLERRM, 500));
  RETURN jsonb_build_object('ok', false, 'error', left(SQLERRM, 500));
END;
$$;

REVOKE ALL     ON FUNCTION public.detect_camera_clock_skew(integer, integer, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.detect_camera_clock_skew(integer, integer, integer, integer) TO authenticated, service_role;