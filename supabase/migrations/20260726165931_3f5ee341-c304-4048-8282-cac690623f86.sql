-- ============================================================================
-- Onda 114 — Fan-in dos detectores especializados (Ondas 112 e 113) para o
-- barramento de alertas de manutenção (Onda 110) e, por herança, para o
-- despachante externo (Onda 111).
--
-- Decisão de projeto: o SQL só avalia FATOS diretamente observáveis em tabela
-- (execução ausente/obsoleta/falha, contagens já materializadas). A projeção
-- de saturação por Theil–Sen permanece exclusivamente em
-- src/lib/partitionBacklogTrend.ts e src/lib/maintenanceSourceAlerts.ts, para
-- não existirem duas implementações da mesma regra divergindo com o tempo.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluate_maintenance_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stale_hours    constant int := 48;
  cooldown_hours constant int := 6;
  backlog_max    constant int := 10000;

  rec            record;
  severity       text;
  reason         text;
  detail         jsonb;
  age_hours      numeric;
  emitted        int := 0;
  suppressed     int := 0;
  results        jsonb := '[]'::jsonb;

  skew_run       record;
  backlog_row    record;
BEGIN
  -- G6: o avaliador roda de hora em hora; nunca pode segurar o pool.
  PERFORM set_config('statement_timeout', '20s', true);

  FOR rec IN
    SELECT 'partition_maintenance'::text AS routine, x.ran_at, x.ok,
           false AS locked_out, 0::bigint AS backlog, x.error_detail
    FROM (SELECT ran_at, ok, error_detail FROM public.partition_maintenance_runs
          ORDER BY ran_at DESC LIMIT 1) x
    UNION ALL
    SELECT 'partition_drain', x.ran_at, x.ok, x.locked_out,
           COALESCE(x.quarantined, 0)::bigint, x.error_detail
    FROM (SELECT ran_at, ok, locked_out, quarantined, error_detail FROM public.partition_drain_runs
          ORDER BY ran_at DESC LIMIT 1) x
    UNION ALL
    SELECT 'partition_quarantine', x.ran_at, x.ok, x.locked_out,
           COALESCE(x.total_quarantined, 0)::bigint, x.error_detail
    FROM (SELECT ran_at, ok, locked_out, total_quarantined, error_detail FROM public.partition_quarantine_runs
          ORDER BY ran_at DESC LIMIT 1) x
  LOOP
    age_hours := EXTRACT(EPOCH FROM (now() - rec.ran_at)) / 3600.0;
    severity  := NULL;
    reason    := NULL;

    IF age_hours > stale_hours THEN
      severity := 'critical';
      reason   := format('sem execução há %sh (limite %sh)', round(age_hours), stale_hours);
    ELSIF NOT rec.ok THEN
      severity := 'critical';
      reason   := COALESCE('última execução falhou: ' || rec.error_detail, 'última execução falhou');
    ELSIF rec.backlog > backlog_max THEN
      severity := 'critical';
      reason   := format('backlog de %s linhas na partição DEFAULT', rec.backlog);
    ELSIF rec.locked_out THEN
      severity := 'warning';
      reason   := 'execução adiada por trava concorrente';
    ELSIF rec.backlog > 0 THEN
      severity := 'warning';
      reason   := format('backlog residual de %s linhas', rec.backlog);
    END IF;

    IF severity IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = rec.routine
          AND e.severity = severity
          AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        suppressed := suppressed + 1;
      ELSE
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
        VALUES (
          rec.routine, severity, reason,
          jsonb_build_object('backlog', rec.backlog, 'locked_out', rec.locked_out, 'ok', rec.ok),
          rec.ran_at
        );
        emitted := emitted + 1;
      END IF;
    END IF;

    results := results || jsonb_build_object(
      'routine',  rec.routine,
      'ran_at',   rec.ran_at,
      'severity', COALESCE(severity, 'none'),
      'reason',   COALESCE(reason, 'saudável')
    );
  END LOOP;

  FOR rec IN
    SELECT unnest(ARRAY['partition_maintenance','partition_drain','partition_quarantine']) AS routine
  LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(results) x WHERE x->>'routine' = rec.routine) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_alert_events e
        WHERE e.routine = rec.routine AND e.severity = 'critical'
          AND e.created_at > now() - make_interval(hours => cooldown_hours)
      ) THEN
        INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail)
        VALUES (rec.routine, 'critical', 'rotina nunca executou', '{"never_ran": true}'::jsonb);
        emitted := emitted + 1;
      ELSE
        suppressed := suppressed + 1;
      END IF;

      results := results || jsonb_build_object(
        'routine', rec.routine, 'ran_at', NULL,
        'severity', 'critical', 'reason', 'rotina nunca executou'
      );
    END IF;
  END LOOP;

  -- ==========================================================================
  -- Onda 114 / fonte 1: detector de relógio das câmeras (Onda 112).
  -- Ordem das regras = ordem de gravidade. Um detector quebrado tem
  -- precedência sobre as contagens que ele mediu antes de quebrar.
  -- ==========================================================================
  SELECT r.ran_at, r.ok, r.error_detail, r.cameras_analyzed,
         r.cameras_warning, r.cameras_critical
    INTO skew_run
  FROM public.camera_clock_skew_runs r
  ORDER BY r.ran_at DESC
  LIMIT 1;

  severity := NULL; reason := NULL; detail := '{}'::jsonb;

  IF skew_run IS NULL THEN
    severity := 'critical';
    reason   := 'detector de relógio nunca executou';
    detail   := jsonb_build_object('never_ran', true);
  ELSE
    -- GREATEST(0, ...) protege contra recuo de relógio (NTP step) no servidor.
    age_hours := GREATEST(0, EXTRACT(EPOCH FROM (now() - skew_run.ran_at)) / 3600.0);

    IF age_hours > stale_hours THEN
      severity := 'critical';
      reason   := format('detector de relógio sem execução há %sh (limite %sh)', round(age_hours), stale_hours);
      detail   := jsonb_build_object('stale', true, 'age_hours', round(age_hours, 2));
    ELSIF NOT skew_run.ok THEN
      severity := 'critical';
      reason   := COALESCE('última varredura de relógio falhou: ' || skew_run.error_detail,
                           'última varredura de relógio falhou');
      detail   := jsonb_build_object('ok', false, 'error_detail', skew_run.error_detail);
    ELSIF skew_run.cameras_critical > 0 THEN
      severity := 'critical';
      reason   := format('%s câmera(s) com relógio criticamente dessincronizado', skew_run.cameras_critical);
      detail   := jsonb_build_object('cameras_critical', skew_run.cameras_critical,
                                     'cameras_warning',  skew_run.cameras_warning,
                                     'cameras_analyzed', skew_run.cameras_analyzed);
    ELSIF skew_run.cameras_warning > 0 THEN
      severity := 'warning';
      reason   := format('%s câmera(s) com desvio de relógio acima do tolerado', skew_run.cameras_warning);
      detail   := jsonb_build_object('cameras_critical', 0,
                                     'cameras_warning',  skew_run.cameras_warning,
                                     'cameras_analyzed', skew_run.cameras_analyzed);
    END IF;
  END IF;

  IF severity IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'camera_clock_skew' AND e.severity = severity
        AND e.created_at > now() - make_interval(hours => cooldown_hours)
    ) THEN
      suppressed := suppressed + 1;
    ELSE
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES ('camera_clock_skew', severity, reason, detail,
              CASE WHEN skew_run IS NULL THEN NULL ELSE skew_run.ran_at END);
      emitted := emitted + 1;
    END IF;
  END IF;

  results := results || jsonb_build_object(
    'routine',  'camera_clock_skew',
    'ran_at',   CASE WHEN skew_run IS NULL THEN NULL ELSE skew_run.ran_at END,
    'severity', COALESCE(severity, 'none'),
    'reason',   COALESCE(reason, 'saudável')
  );

  -- ==========================================================================
  -- Onda 114 / fonte 2: coletor de backlog das partições DEFAULT (Onda 113).
  -- Só fatos: coletor cego, coletor obsoleto, volume absoluto. A projeção de
  -- saturação continua sendo responsabilidade exclusiva do gate de CI/UI.
  -- ==========================================================================
  severity := NULL; reason := NULL; detail := '{}'::jsonb;

  SELECT count(*)                                             AS series_count,
         max(s.sampled_at)                                    AS newest,
         GREATEST(0, EXTRACT(EPOCH FROM (now() - max(s.sampled_at))) / 3600.0) AS age_hours
    INTO backlog_row
  FROM (
    SELECT DISTINCT ON (parent_table) parent_table, sampled_at, row_count
    FROM public.partition_backlog_samples
    ORDER BY parent_table, sampled_at DESC
  ) s;

  IF backlog_row.series_count = 0 THEN
    severity := 'critical';
    reason   := 'coletor de backlog cego: nenhuma série disponível';
    detail   := jsonb_build_object('blind', true);
  ELSIF backlog_row.age_hours > stale_hours THEN
    severity := 'critical';
    reason   := format('coletor de backlog sem amostra há %sh (limite %sh)',
                       round(backlog_row.age_hours), stale_hours);
    detail   := jsonb_build_object('stale', true, 'age_hours', round(backlog_row.age_hours, 2));
  ELSE
    SELECT s.parent_table, s.row_count
      INTO rec
    FROM (
      SELECT DISTINCT ON (parent_table) parent_table, row_count
      FROM public.partition_backlog_samples
      ORDER BY parent_table, sampled_at DESC
    ) s
    ORDER BY s.row_count DESC
    LIMIT 1;

    IF rec.row_count > backlog_max THEN
      severity := 'critical';
      reason   := format('backlog crítico em %s: %s linhas na DEFAULT', rec.parent_table, rec.row_count);
      detail   := jsonb_build_object('parent', rec.parent_table, 'current_rows', rec.row_count);
    ELSIF rec.row_count > 0 THEN
      severity := 'warning';
      reason   := format('backlog residual em %s: %s linhas na DEFAULT', rec.parent_table, rec.row_count);
      detail   := jsonb_build_object('parent', rec.parent_table, 'current_rows', rec.row_count);
    END IF;
  END IF;

  IF severity IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'partition_backlog_trend' AND e.severity = severity
        AND e.created_at > now() - make_interval(hours => cooldown_hours)
    ) THEN
      suppressed := suppressed + 1;
    ELSE
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES ('partition_backlog_trend', severity, reason, detail, backlog_row.newest);
      emitted := emitted + 1;
    END IF;
  END IF;

  results := results || jsonb_build_object(
    'routine',  'partition_backlog_trend',
    'ran_at',   backlog_row.newest,
    'severity', COALESCE(severity, 'none'),
    'reason',   COALESCE(reason, 'saudável')
  );

  -- G8: retenção de 90 dias.
  DELETE FROM public.maintenance_alert_events
  WHERE created_at < now() - interval '90 days';

  RETURN jsonb_build_object(
    'emitted', emitted, 'suppressed', suppressed, 'routines', results
  );
END;
$function$;

COMMENT ON FUNCTION public.evaluate_maintenance_alerts() IS
  'Onda 114: avalia rotinas de particionamento + detector de relógio (112) + coletor de backlog (113), emitindo alertas com cooldown de 6h por (rotina, severidade).';
