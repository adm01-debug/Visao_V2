-- ROLLBACK:
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.purge_cron_job_run_details(integer);
--   SELECT cron.unschedule('purge-cron-history-daily');
--   -- Restaura a definição anterior de get_operational_metrics, sem
--   -- partition_runs/cron_health e sem statement_timeout por bloco:
--   --   supabase/migrations/20260808143000_fix_get_operational_metrics_remove_role_check.sql
--   COMMIT;

BEGIN;

-- Fix: get_operational_metrics retornava 500 em produção.
--
-- Causa raiz: cron.job_run_details acumulou 2.029.549 linhas / 1,2 GB porque
-- nenhum job remove o histórico do pg_cron. A tabela só tem índice na PK
-- (runid); as consultas da RPC filtram por jobname/start_time e faziam
-- sequential scan. Com statement_timeout de 8s, estouravam (57014).
-- O bloco `EXCEPTION WHEN OTHERS` NÃO captura query_canceled, então o erro
-- propagava como HTTP 500 em vez de degradar para '[]'.
--
-- Além disso, a migration 20260808143000 reescreveu a função e removeu os
-- campos `partition_runs` e `cron_health`, que OperationsPage.tsx e
-- useCronFreshness.ts continuam consumindo — o painel de saúde dos crons
-- ficou permanentemente vazio. Esta migration restaura os campos.

-- 1. Purga do histórico do pg_cron. Sem isso o problema volta em semanas.
CREATE OR REPLACE FUNCTION public.purge_cron_job_run_details(p_days integer DEFAULT 3)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $function$
DECLARE
  deleted bigint;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'p_days deve ser >= 1';
  END IF;

  -- Trava curta: o histórico não é fonte de verdade, e uma falha aqui não
  -- pode derrubar o job inteiro.
  PERFORM set_config('lock_timeout', '10s', true);

  DELETE FROM cron.job_run_details
  WHERE start_time < now() - make_interval(days => p_days);

  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_cron_job_run_details(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_cron_job_run_details(integer) FROM anon;
REVOKE ALL ON FUNCTION public.purge_cron_job_run_details(integer) FROM authenticated;

SELECT cron.schedule(
  'purge-cron-history-daily',
  '23 4 * * *',
  $$SELECT public.purge_cron_job_run_details(3)$$
);

-- 2. get_operational_metrics: restaura partition_runs e cron_health e torna
--    cada bloco resiliente a statement_timeout (queries independentes: a
--    falha de uma não pode zerar as outras).
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
  -- Orçamento por bloco. query_canceled é capturado abaixo, então um bloco
  -- lento vira '[]' em vez de derrubar a RPC com HTTP 500.
  PERFORM set_config('statement_timeout', '4s', true);

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO cache_stats
    FROM (
      SELECT
        (metadata->>'namespace') AS namespace,
        COUNT(*) FILTER (WHERE query_type = 'edge_cache_hit') AS hits,
        COUNT(*) FILTER (WHERE query_type = 'edge_cache_miss') AS misses,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE query_type = 'edge_cache_hit')::numeric
          / NULLIF(COUNT(*), 0), 2
        ) AS hit_ratio_pct
      FROM public.query_telemetry
      WHERE table_name = 'edge_cache'
        AND created_at > now() - interval '24 hours'
        AND metadata->>'namespace' IS NOT NULL
      GROUP BY metadata->>'namespace'
      ORDER BY namespace
      LIMIT 20
    ) t;
  EXCEPTION
    WHEN query_canceled THEN cache_stats := '[]'::jsonb;
    WHEN OTHERS THEN cache_stats := '[]'::jsonb;
  END;

  BEGIN
    SELECT jsonb_build_object(
      'total_rows', COUNT(*),
      'total_bytes', COALESCE(SUM(size_bytes), 0),
      'oldest', MIN(created_at),
      'newest', MAX(created_at)
    ) INTO cache_size
    FROM public.edge_cache;
  EXCEPTION
    WHEN query_canceled THEN cache_size := jsonb_build_object(
      'total_rows', 0, 'total_bytes', 0, 'oldest', NULL, 'newest', NULL);
    WHEN OTHERS THEN cache_size := jsonb_build_object(
      'total_rows', 0, 'total_bytes', 0, 'oldest', NULL, 'newest', NULL);
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO cron_runs
    FROM (
      SELECT jrd.jobid, jrd.runid, jrd.status, jrd.return_message,
             jrd.start_time, jrd.end_time
      FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
      WHERE j.jobname = 'visao-daily-retention'
        AND jrd.start_time > now() - interval '30 days'
      ORDER BY jrd.start_time DESC
      LIMIT 10
    ) r;
  EXCEPTION
    WHEN query_canceled THEN cron_runs := '[]'::jsonb;
    WHEN OTHERS THEN cron_runs := '[]'::jsonb;
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) INTO partition_runs
    FROM (
      SELECT jrd.jobid, jrd.runid, jrd.status, jrd.return_message,
             jrd.start_time, jrd.end_time
      FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
      WHERE j.jobname = 'visao-monthly-partitions'
        AND jrd.start_time > now() - interval '180 days'
      ORDER BY jrd.start_time DESC
      LIMIT 6
    ) r;
  EXCEPTION
    WHEN query_canceled THEN partition_runs := '[]'::jsonb;
    WHEN OTHERS THEN partition_runs := '[]'::jsonb;
  END;

  BEGIN
    SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb) INTO cron_health
    FROM (
      SELECT j.jobname,
             j.schedule,
             j.active,
             COUNT(*) FILTER (
               WHERE jrd.status = 'failed'
                 AND jrd.start_time > now() - interval '7 days'
             ) AS failed_7d,
             MAX(jrd.start_time) AS last_run,
             (ARRAY_AGG(jrd.status ORDER BY jrd.start_time DESC))[1] AS last_status
      FROM cron.job j
      LEFT JOIN cron.job_run_details jrd
        ON jrd.jobid = j.jobid
       AND jrd.start_time > now() - interval '7 days'
      WHERE j.jobname LIKE 'visao-%'
      GROUP BY j.jobname, j.schedule, j.active
      ORDER BY j.jobname
      LIMIT 100
    ) h;
  EXCEPTION
    WHEN query_canceled THEN cron_health := '[]'::jsonb;
    WHEN OTHERS THEN cron_health := '[]'::jsonb;
  END;

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

REVOKE ALL ON FUNCTION public.get_operational_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_operational_metrics() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_operational_metrics() TO authenticated;

COMMIT;
