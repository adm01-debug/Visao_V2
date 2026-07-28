-- Onda 232 — Fan-in do passivo do expurgo do livro de admissão.
-- Espelho SQL de src/lib/alarms/admissionBacklogAlert.ts (leis I1–I8).

-- Núcleo puro: classifica uma série de passivo (mais recente primeiro).
CREATE OR REPLACE FUNCTION public.admission_backlog_classify(p_series bigint[])
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_len         int := COALESCE(array_length(p_series, 1), 0);
  v_consecutive int := 0;
  v_growing     boolean := false;
  i             int;
  v_prev        bigint;
  v_curr        bigint;
BEGIN
  -- I2 — sem execução legível não se acusa passivo.
  IF v_len = 0 THEN RETURN 'no_data'; END IF;
  -- I3 — a execução mais recente manda.
  IF p_series[1] = 0 THEN RETURN 'clear'; END IF;

  FOR i IN 1..v_len LOOP
    IF p_series[i] > 0 THEN v_consecutive := v_consecutive + 1; ELSE EXIT; END IF;
  END LOOP;

  -- I6 — crescimento estrito lido do mais antigo para o mais recente.
  FOR i IN REVERSE v_consecutive..2 LOOP
    v_prev := p_series[i];      -- mais antigo
    v_curr := p_series[i - 1];  -- mais recente
    IF v_curr > v_prev THEN v_growing := true;
    ELSIF v_curr < v_prev THEN v_growing := false;
    END IF;
  END LOOP;

  IF v_growing THEN RETURN 'growing'; END IF;
  IF v_consecutive >= 3 THEN RETURN 'persistent'; END IF;  -- I5 (PERSIST_RUNS)
  RETURN 'spike';                                          -- I4
END;
$$;

REVOKE ALL ON FUNCTION public.admission_backlog_classify(bigint[]) FROM PUBLIC, anon, authenticated;

-- Retrato do eixo de passivo a partir da trilha imutável.
CREATE OR REPLACE FUNCTION public.admission_backlog_assess(p_window int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window int := GREATEST(1, COALESCE(p_window, 3));
  v_series bigint[];
  v_recent record;
  v_valid  int;
BEGIN
  -- I1 — apenas execuções válidas (espelha as guardas da leitura em TS).
  WITH valid AS (
    SELECT *
    FROM public.admission_ledger_purge_runs r
    WHERE r.executed_at IS NOT NULL
      AND r.batch_cap >= 1
      AND r.retention_days >= 1
      AND r.deleted_count <= r.batch_cap
      AND r.capped = (r.deferred_count > 0)
      AND r.cutoff_at <= r.executed_at
  )
  SELECT count(*) INTO v_valid FROM valid;

  SELECT array_agg(deferred_count ORDER BY executed_at DESC, id DESC)
    INTO v_series
  FROM (
    SELECT r.id, r.executed_at, r.deferred_count
    FROM public.admission_ledger_purge_runs r
    WHERE r.executed_at IS NOT NULL
      AND r.batch_cap >= 1
      AND r.retention_days >= 1
      AND r.deleted_count <= r.batch_cap
      AND r.capped = (r.deferred_count > 0)
      AND r.cutoff_at <= r.executed_at
    ORDER BY r.executed_at DESC, r.id DESC
    LIMIT v_window
  ) s;

  SELECT r.executed_at, r.deferred_count, r.batch_cap
    INTO v_recent
  FROM public.admission_ledger_purge_runs r
  WHERE r.executed_at IS NOT NULL
    AND r.batch_cap >= 1
    AND r.retention_days >= 1
    AND r.deleted_count <= r.batch_cap
    AND r.capped = (r.deferred_count > 0)
    AND r.cutoff_at <= r.executed_at
  ORDER BY r.executed_at DESC, r.id DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'verdict',          public.admission_backlog_classify(COALESCE(v_series, ARRAY[]::bigint[])),
    'deferred_now',     COALESCE(v_recent.deferred_count, 0),
    'batch_cap',        v_recent.batch_cap,
    'last_run_at',      v_recent.executed_at,
    'valid_runs',       COALESCE(v_valid, 0),
    'trend',            to_jsonb(COALESCE((SELECT array_agg(x ORDER BY ord DESC)
                                           FROM unnest(COALESCE(v_series, ARRAY[]::bigint[]))
                                                WITH ORDINALITY AS t(x, ord)), ARRAY[]::bigint[]))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admission_backlog_assess(int) FROM PUBLIC, anon, authenticated;

-- Fan-in: leva o veredito ao barramento de manutenção, com cooldown (I7/I8).
CREATE OR REPLACE FUNCTION public.evaluate_admission_backlog_alerts(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cadence_minutes  constant int := 1440;   -- cron `47 3 * * *`
  cooldown_floor   constant int := 60;
  cooldown_ceiling constant int := 1440;

  v_assess    jsonb;
  v_verdict   text;
  v_severity  text;
  v_reason    text;
  v_cooldown  int;
  v_key       constant text := 'admission_backlog:ledger_purge';
  v_label     constant text := 'Expurgo do livro de admissão';
  v_deferred  bigint;
  v_cap       int;
  v_trend     text;
  v_consec    int;
  v_emitted   int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  v_assess  := public.admission_backlog_assess(3);
  v_verdict := v_assess->>'verdict';
  v_deferred := COALESCE((v_assess->>'deferred_now')::bigint, 0);
  v_cap      := NULLIF(v_assess->>'batch_cap', '')::int;
  v_cooldown := LEAST(cooldown_ceiling, GREATEST(cooldown_floor, cadence_minutes));

  SELECT string_agg(value::text, ' → ' ORDER BY ord)
    INTO v_trend
  FROM jsonb_array_elements_text(v_assess->'trend') WITH ORDINALITY AS t(value, ord);

  SELECT count(*) INTO v_consec
  FROM jsonb_array_elements_text(v_assess->'trend') AS t(value)
  WHERE value::bigint > 0;

  v_severity := CASE v_verdict
    WHEN 'growing'    THEN 'critical'
    WHEN 'persistent' THEN 'critical'
    WHEN 'spike'      THEN 'warning'
    ELSE NULL
  END;

  IF v_severity IS NOT NULL THEN
    v_reason := CASE v_verdict
      WHEN 'growing' THEN
        format('%s: passivo crescente (%s) em %s execuções — %s, cadência %s min',
               v_label, COALESCE(v_trend, ''), v_consec,
               CASE WHEN v_cap IS NULL THEN 'teto não declarado' ELSE 'teto ' || v_cap END,
               cadence_minutes)
      WHEN 'persistent' THEN
        format('%s: passivo de %s linhas persiste há %s execuções — %s, cadência %s min',
               v_label, v_deferred, v_consec,
               CASE WHEN v_cap IS NULL THEN 'teto não declarado' ELSE 'teto ' || v_cap END,
               cadence_minutes)
      ELSE
        format('%s: %s linhas vencidas ficaram para trás na última execução — %s, cadência %s min',
               v_label, v_deferred,
               CASE WHEN v_cap IS NULL THEN 'teto não declarado' ELSE 'teto ' || v_cap END,
               cadence_minutes)
    END;

    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = v_key
        AND e.severity = v_severity
        AND e.created_at > p_now - make_interval(mins => v_cooldown)
    ) THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES (
        v_key, v_severity, v_reason,
        jsonb_build_object(
          'job_name',         'ledger_purge',
          'verdict',          v_verdict,
          'deferred_now',     v_deferred,
          'consecutive_runs', v_consec,
          'batch_cap',        v_cap,
          'trend',            v_assess->'trend',
          'cadence_minutes',  cadence_minutes,
          'cooldown_minutes', v_cooldown
        ),
        COALESCE((v_assess->>'last_run_at')::timestamptz, p_now)
      );
      v_emitted := 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'evaluated_at', p_now,
    'routine',      v_key,
    'verdict',      v_verdict,
    'severity',     COALESCE(v_severity, 'none'),
    'emitted',      v_emitted,
    'assessment',   v_assess
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_admission_backlog_alerts(timestamptz) FROM PUBLIC, anon, authenticated;

-- Agendamento: 30 minutos após o expurgo (`47 3 * * *`).
SELECT cron.unschedule('admission-backlog-fanin')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'admission-backlog-fanin');

SELECT cron.schedule(
  'admission-backlog-fanin',
  '17 4 * * *',
  $cron$SELECT public.evaluate_admission_backlog_alerts();$cron$
);