-- Onda 236 — fan-in da tendência do órfão para o barramento de manutenção.
-- Espelho SQL de src/lib/alarms/admissionTrendAlert.ts (leis M1–M8).

-- M1/M2/M3/M4/M5 — severidade derivada do veredito de tendência.
CREATE OR REPLACE FUNCTION public.admission_trend_severity(p_verdict text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_verdict
    WHEN 'growing'    THEN 'critical'
    WHEN 'persistent' THEN 'critical'
    WHEN 'resolving'  THEN 'warning'
    WHEN 'emerging'   THEN 'warning'
    ELSE NULL
  END;
$$;

-- M2/M3 — cooldown derivado da cadência E do veredito, com piso 60 e teto 1440.
CREATE OR REPLACE FUNCTION public.admission_trend_cooldown(
  p_cadence_minutes integer,
  p_verdict text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_base integer;
BEGIN
  IF p_cadence_minutes IS NULL OR p_cadence_minutes <= 0 THEN
    RAISE EXCEPTION 'cadencia invalida para cooldown: %', p_cadence_minutes
      USING ERRCODE = '22023';
  END IF;
  v_base := CASE WHEN p_verdict = 'growing'
                 THEN round(p_cadence_minutes::numeric / 2)::integer
                 ELSE p_cadence_minutes END;
  RETURN LEAST(1440, GREATEST(60, v_base));
END;
$$;

-- Avaliador: lê a série persistida, classifica e emite no barramento.
CREATE OR REPLACE FUNCTION public.evaluate_admission_trend_alerts(
  p_now timestamptz DEFAULT now(),
  p_window integer DEFAULT 14,
  cadence_minutes integer DEFAULT 1440
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now         timestamptz := COALESCE(p_now, now());
  v_key         text := 'admission_trend:ledger_stock';
  v_series      bigint[];
  v_readable    integer := 0;
  v_unreadable  integer := 0;
  v_verdict     text;
  v_severity    text;
  v_cooldown    integer;
  v_orphan_now  bigint := 0;
  v_consecutive integer := 0;
  v_last_at     timestamptz;
  v_reason      text;
  v_emitted     integer := 0;
  v_serie_txt   text;
  v_n           integer;
BEGIN
  -- L1/M6 — apenas fotos legíveis entram na série; as demais são contadas à parte.
  SELECT
    COALESCE(array_agg(s.orphan_count ORDER BY s.observed_at, s.id), ARRAY[]::bigint[]),
    COUNT(*)::integer,
    MAX(s.observed_at)
  INTO v_series, v_readable, v_last_at
  FROM (
    SELECT r.id, r.observed_at, r.orphan_count
    FROM public.admission_reconcile_snapshots r
    WHERE r.orphan_count IS NOT NULL
      AND r.observed_at IS NOT NULL
    ORDER BY r.observed_at DESC, r.id DESC
    LIMIT GREATEST(1, COALESCE(p_window, 14))
  ) s;

  SELECT COUNT(*)::integer INTO v_unreadable
  FROM public.admission_reconcile_snapshots r
  WHERE r.orphan_count IS NULL OR r.observed_at IS NULL;

  v_verdict := public.admission_orphan_trend_classify(v_series);

  IF v_readable > 0 THEN
    v_orphan_now := COALESCE(v_series[array_length(v_series, 1)], 0);
    v_n := COALESCE(array_length(v_series, 1), 0);
    WHILE v_n >= 1 AND COALESCE(v_series[v_n], 0) > 0 LOOP
      v_consecutive := v_consecutive + 1;
      v_n := v_n - 1;
    END LOOP;
  END IF;

  -- M6 — sem foto legível não há tendência a acusar.
  IF v_readable > 0 THEN
    v_severity := public.admission_trend_severity(v_verdict);
  END IF;

  IF v_severity IS NOT NULL THEN
    v_cooldown := public.admission_trend_cooldown(cadence_minutes, v_verdict);

    SELECT string_agg(x::text, ' -> ' ORDER BY ord)
    INTO v_serie_txt
    FROM unnest(v_series) WITH ORDINALITY AS t(x, ord);

    -- M8 — a frase sempre carrega a série que sustenta o veredito.
    v_reason := CASE v_verdict
      WHEN 'growing' THEN
        format('Orfao do livro de admissao crescente (%s) em %s conciliacoes', v_serie_txt, v_consecutive)
      WHEN 'persistent' THEN
        format('Orfao do livro de admissao persiste em %s conciliacoes (%s)', v_consecutive, v_serie_txt)
      WHEN 'resolving' THEN
        format('Orfao do livro de admissao em queda (%s) - ainda %s janela(s) sem dono', v_serie_txt, v_orphan_now)
      ELSE
        format('Orfao do livro de admissao recem-observado (%s) - amostra insuficiente para padrao', v_serie_txt)
    END || format(' - %s foto(s) legivel(is), %s descartada(s), cadencia %s min',
                  v_readable, v_unreadable, cadence_minutes);

    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = v_key
        AND e.severity = v_severity
        AND e.created_at > v_now - make_interval(mins => v_cooldown)
    ) THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES (
        v_key, v_severity, v_reason,
        jsonb_build_object(
          'job_name',         'ledger_stock',
          'verdict',          v_verdict,
          'orphan_now',       v_orphan_now,
          'consecutive',      v_consecutive,
          'series',           to_jsonb(v_series),
          'readable',         v_readable,
          'unreadable',       v_unreadable,
          'window',           GREATEST(1, COALESCE(p_window, 14)),
          'cadence_minutes',  cadence_minutes,
          'cooldown_minutes', v_cooldown
        ),
        COALESCE(v_last_at, v_now)
      );
      v_emitted := 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'evaluated_at', v_now,
    'routine',      v_key,
    'verdict',      v_verdict,
    'severity',     COALESCE(v_severity, 'none'),
    'emitted',      v_emitted,
    'readable',     v_readable,
    'unreadable',   v_unreadable,
    'series',       to_jsonb(v_series)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admission_trend_severity(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_trend_cooldown(integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_admission_trend_alerts(timestamptz, integer, integer) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('evaluate-admission-trend');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 55 3 — depois do snapshot (51) e do fan-in da foto (53).
SELECT cron.schedule(
  'evaluate-admission-trend',
  '55 3 * * *',
  $cron$SELECT public.evaluate_admission_trend_alerts();$cron$
);