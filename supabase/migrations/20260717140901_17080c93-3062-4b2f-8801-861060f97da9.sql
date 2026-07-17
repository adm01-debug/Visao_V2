CREATE OR REPLACE FUNCTION public.get_bgwriter_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bg_row record;
  wal_row record;
  wal_available boolean := false;
  checkpoints_total bigint;
  req_ratio_pct numeric;
  backend_ratio_pct numeric;
  hours_since_reset numeric;
  checkpoint_severity text := 'ok';
  backend_severity text := 'ok';
  wal_severity text := 'ok';
  recommendations jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  SELECT
    checkpoints_timed, checkpoints_req, checkpoint_write_time, checkpoint_sync_time,
    buffers_checkpoint, buffers_clean, buffers_backend, buffers_backend_fsync,
    buffers_alloc, maxwritten_clean, stats_reset
  INTO bg_row
  FROM pg_stat_bgwriter;

  checkpoints_total := COALESCE(bg_row.checkpoints_timed, 0) + COALESCE(bg_row.checkpoints_req, 0);
  hours_since_reset := CASE WHEN bg_row.stats_reset IS NOT NULL
    THEN ROUND(EXTRACT(EPOCH FROM (now() - bg_row.stats_reset)) / 3600, 2)
    ELSE NULL END;

  req_ratio_pct := CASE WHEN checkpoints_total > 0
    THEN ROUND(100.0 * bg_row.checkpoints_req::numeric / checkpoints_total, 2)
    ELSE 0 END;

  backend_ratio_pct := CASE WHEN (bg_row.buffers_checkpoint + bg_row.buffers_clean + bg_row.buffers_backend) > 0
    THEN ROUND(100.0 * bg_row.buffers_backend::numeric
         / (bg_row.buffers_checkpoint + bg_row.buffers_clean + bg_row.buffers_backend), 2)
    ELSE 0 END;

  -- Severidade: checkpoints forçados
  IF checkpoints_total >= 50 THEN
    IF req_ratio_pct > 50 THEN
      checkpoint_severity := 'critical';
      recommendations := recommendations || jsonb_build_object(
        'area', 'checkpoint',
        'severity', 'critical',
        'issue', format('%s%% dos checkpoints são forçados (WAL cheio)', req_ratio_pct),
        'suggestion', 'Aumentar max_wal_size (ex.: para 4GB-8GB) para reduzir checkpoint pressure.'
      );
    ELSIF req_ratio_pct > 20 THEN
      checkpoint_severity := 'warning';
      recommendations := recommendations || jsonb_build_object(
        'area', 'checkpoint',
        'severity', 'warning',
        'issue', format('%s%% dos checkpoints são forçados', req_ratio_pct),
        'suggestion', 'Considere aumentar max_wal_size e/ou checkpoint_timeout.'
      );
    END IF;
  END IF;

  -- Severidade: backends escrevendo diretamente
  IF (bg_row.buffers_checkpoint + bg_row.buffers_backend) >= 10000 THEN
    IF backend_ratio_pct > 50 THEN
      backend_severity := 'critical';
      recommendations := recommendations || jsonb_build_object(
        'area', 'bgwriter',
        'severity', 'critical',
        'issue', format('%s%% das escritas vêm de backends (BGWriter/checkpoint insuficiente)', backend_ratio_pct),
        'suggestion', 'Reduzir bgwriter_delay, aumentar bgwriter_lru_maxpages e bgwriter_lru_multiplier.'
      );
    ELSIF backend_ratio_pct > 25 THEN
      backend_severity := 'warning';
      recommendations := recommendations || jsonb_build_object(
        'area', 'bgwriter',
        'severity', 'warning',
        'issue', format('%s%% das escritas vêm de backends', backend_ratio_pct),
        'suggestion', 'Monitorar; ajustar bgwriter_lru_maxpages se tendência crescer.'
      );
    END IF;
  END IF;

  IF bg_row.maxwritten_clean > 100 THEN
    recommendations := recommendations || jsonb_build_object(
      'area', 'bgwriter',
      'severity', 'warning',
      'issue', format('BGWriter atingiu maxwritten_clean %s vezes', bg_row.maxwritten_clean),
      'suggestion', 'Aumentar bgwriter_lru_maxpages — BGWriter está parando por limite antes de terminar.'
    );
  END IF;

  IF bg_row.buffers_backend_fsync > 0 THEN
    recommendations := recommendations || jsonb_build_object(
      'area', 'io',
      'severity', 'critical',
      'issue', format('%s fsyncs feitos por backends (fila do checkpointer estourou)', bg_row.buffers_backend_fsync),
      'suggestion', 'Investigar I/O do storage; aumentar checkpoint_completion_target e RAM se possível.'
    );
  END IF;

  -- WAL stats (PG14+)
  BEGIN
    SELECT
      wal_records, wal_fpi, wal_bytes, wal_buffers_full,
      wal_write, wal_sync, wal_write_time, wal_sync_time, stats_reset
    INTO wal_row
    FROM pg_stat_wal;
    wal_available := true;

    IF wal_row.wal_buffers_full > 100 THEN
      wal_severity := 'warning';
      recommendations := recommendations || jsonb_build_object(
        'area', 'wal',
        'severity', 'warning',
        'issue', format('wal_buffers_full = %s (WAL buffer pequeno)', wal_row.wal_buffers_full),
        'suggestion', 'Aumentar wal_buffers (ex.: 16MB-64MB).'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    wal_available := false;
  END;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'stats_reset', bg_row.stats_reset,
    'hours_since_reset', hours_since_reset,
    'checkpoints', jsonb_build_object(
      'timed', bg_row.checkpoints_timed,
      'requested', bg_row.checkpoints_req,
      'total', checkpoints_total,
      'req_ratio_pct', req_ratio_pct,
      'write_time_ms', bg_row.checkpoint_write_time,
      'sync_time_ms', bg_row.checkpoint_sync_time,
      'severity', checkpoint_severity
    ),
    'buffers', jsonb_build_object(
      'checkpoint', bg_row.buffers_checkpoint,
      'bgwriter_clean', bg_row.buffers_clean,
      'backend', bg_row.buffers_backend,
      'backend_fsync', bg_row.buffers_backend_fsync,
      'allocated', bg_row.buffers_alloc,
      'maxwritten_clean', bg_row.maxwritten_clean,
      'backend_ratio_pct', backend_ratio_pct,
      'severity', backend_severity
    ),
    'wal', CASE WHEN wal_available THEN jsonb_build_object(
      'records', wal_row.wal_records,
      'full_page_images', wal_row.wal_fpi,
      'bytes', wal_row.wal_bytes,
      'buffers_full', wal_row.wal_buffers_full,
      'writes', wal_row.wal_write,
      'syncs', wal_row.wal_sync,
      'write_time_ms', wal_row.wal_write_time,
      'sync_time_ms', wal_row.wal_sync_time,
      'stats_reset', wal_row.stats_reset,
      'severity', wal_severity
    ) ELSE NULL END,
    'recommendations', recommendations,
    'overall_severity', CASE
      WHEN checkpoint_severity = 'critical' OR backend_severity = 'critical' OR bg_row.buffers_backend_fsync > 0 THEN 'critical'
      WHEN checkpoint_severity = 'warning' OR backend_severity = 'warning' OR wal_severity = 'warning' THEN 'warning'
      ELSE 'ok'
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_bgwriter_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bgwriter_stats() TO authenticated, service_role;