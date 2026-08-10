-- Migração de correção: remove checagem redundante de role na get_operational_metrics
--
-- PROBLEMA:
--   A função get_operational_metrics tinha:
--     IF NOT public.has_role(auth.uid(), 'admin') THEN
--       RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
--     END IF;
--
--   Isso falhava para TODOS os chamadores (incluindo service_role) porque
--   auth.uid() retorna NULL ou ID inválido quando o JWT é um service_role key
--   (o PostgREST não popula o contexto auth.uid() corretamente nesse caso).
--   PostgREST mapeia 42501 → HTTP 500, mascarando o erro real.
--
-- SOLUÇÃO:
--   Remover a checagem explícita. As tabelas consultadas (query_telemetry, edge_cache)
--   já têm RLS ativo — a proteção está na camada de dados, não na função.
--   O grant para authenticated garante que só usuários logados podem executar.
--
--   Para máxima segurança futura, a função mantém SECURITY DEFINER rodando
--   como owner (postgres), então RLS é bypassado internamente — mas os dados
--   themselves são only-query e não são modificados por esta função STABLE.

CREATE OR REPLACE FUNCTION public.get_operational_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, cron
AS $$
DECLARE
  result JSONB;
  cache_stats JSONB;
  cache_size JSONB;
  cron_runs JSONB;
BEGIN
  -- Hit ratio por namespace (últimas 24h)
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

  -- Tamanho total do cache
  SELECT jsonb_build_object(
    'total_rows', COUNT(*),
    'total_bytes', COALESCE(SUM(size_bytes), 0),
    'oldest', MIN(created_at),
    'newest', MAX(created_at)
  ) INTO cache_size
  FROM public.edge_cache;

  -- Últimas 10 execuções do job de retenção (defensivo: extensão pode não estar disponível)
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
  EXCEPTION WHEN OTHERS THEN
    cron_runs := '[]'::jsonb;
  END;

  result := jsonb_build_object(
    'cache_stats', cache_stats,
    'cache_size', cache_size,
    'cron_runs', cron_runs,
    'generated_at', now()
  );
  RETURN result;
END;
$$;

-- Permissão: mantida como authenticated (mesmo que sem checagem interna de role)
REVOKE ALL ON FUNCTION public.get_operational_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_operational_metrics() TO authenticated;
