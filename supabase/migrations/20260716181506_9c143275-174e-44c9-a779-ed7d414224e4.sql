
CREATE OR REPLACE FUNCTION public.get_operational_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, cron
AS $function$
DECLARE
  result JSONB;
  cache_stats JSONB;
  cache_size JSONB;
  cron_runs JSONB;
  partition_runs JSONB;
  cron_health JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO cache_stats
  FROM (
    SELECT
      (metadata->>'namespace') AS namespace,
      COUNT(*) FILTER (WHERE query_type = 'edge_cache_hit') AS hits,
      COUNT(*) FILTER (WHERE query_type = 'edge_cache_miss') AS misses,
      ROUND(100.0 * COUNT(*) FILTER (WHERE query_type = 'edge_cache_hit')::numeric
            / NULLIF(COUNT(*), 0), 2) AS hit_ratio_pct
    FROM public.query_telemetry
    WHERE table_name = 'edge_cache'
      AND created_at > now() - interval '24 hours'
      AND metadata->>'namespace' IS NOT NULL
    GROUP BY metadata->>'namespace'
    ORDER BY namespace
    LIMIT 20
  ) t;

  SELECT jsonb_build_object(
    'total_rows', COUNT(*),
    'total_bytes', COALESCE(SUM(size_bytes), 0),
    'oldest', MIN(created_at),
    'newest', MAX(created_at)
  ) INTO cache_size
  FROM public.edge_cache;

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO cron_runs
    FROM (
      SELECT jrd.jobid, jrd.runid, jrd.status, jrd.return_message,
             jrd.start_time, jrd.end_time
      FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
      WHERE j.jobname = 'visao-daily-retention'
      ORDER BY jrd.start_time DESC
      LIMIT 10
    ) r;
  EXCEPTION WHEN OTHERS THEN cron_runs := '[]'::jsonb; END;

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO partition_runs
    FROM (
      SELECT jrd.jobid, jrd.runid, jrd.status, jrd.return_message,
             jrd.start_time, jrd.end_time
      FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
      WHERE j.jobname = 'visao-monthly-partitions'
      ORDER BY jrd.start_time DESC
      LIMIT 6
    ) r;
  EXCEPTION WHEN OTHERS THEN partition_runs := '[]'::jsonb; END;

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb) INTO cron_health
    FROM (
      SELECT j.jobname,
             j.schedule,
             j.active,
             COUNT(*) FILTER (WHERE jrd.status = 'failed'
                              AND jrd.start_time > now() - interval '7 days') AS failed_7d,
             MAX(jrd.start_time) AS last_run,
             MAX(jrd.status) FILTER (WHERE jrd.start_time = (
               SELECT MAX(start_time) FROM cron.job_run_details WHERE jobid = j.jobid
             )) AS last_status
      FROM cron.job j
      LEFT JOIN cron.job_run_details jrd ON jrd.jobid = j.jobid
      WHERE j.jobname LIKE 'visao-%'
      GROUP BY j.jobname, j.schedule, j.active, j.jobid
      ORDER BY j.jobname
    ) h;
  EXCEPTION WHEN OTHERS THEN cron_health := '[]'::jsonb; END;

  result := jsonb_build_object(
    'cache_stats', cache_stats,
    'cache_size', cache_size,
    'cron_runs', cron_runs,
    'partition_runs', partition_runs,
    'cron_health', cron_health,
    'generated_at', now()
  );
  RETURN result;
END;
$function$;
