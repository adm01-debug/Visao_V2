-- Onda 234 — Fan-in do veredito de conciliação para o barramento de manutenção.
CREATE OR REPLACE FUNCTION public.admission_reconcile_severity(
  p_verdict text,
  p_reason  text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_verdict = 'unaccounted' THEN RETURN 'critical'; END IF;
  IF p_verdict = 'no_run'      THEN RETURN 'warning';  END IF;
  IF p_verdict = 'indeterminate' THEN
    IF p_reason IS NOT DISTINCT FROM 'inventario_anterior_a_execucao' THEN
      RETURN NULL;
    END IF;
    RETURN 'warning';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admission_reconcile_severity(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admission_reconcile_severity(text, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admission_reconcile_cooldown(
  p_cadence_minutes integer,
  p_severity        text
) RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_base integer;
BEGIN
  IF p_cadence_minutes IS NULL OR p_cadence_minutes <= 0 THEN
    RAISE EXCEPTION 'cadencia invalida para cooldown: %', p_cadence_minutes;
  END IF;
  v_base := CASE WHEN p_severity = 'critical'
                 THEN round(p_cadence_minutes::numeric / 2)::int
                 ELSE p_cadence_minutes END;
  RETURN LEAST(1440, GREATEST(60, v_base));
END;
$$;

REVOKE ALL ON FUNCTION public.admission_reconcile_cooldown(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admission_reconcile_cooldown(integer, text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.evaluate_admission_reconcile_alerts(
  p_now timestamp with time zone DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cadence_minutes constant int  := 1440;
  v_key           constant text := 'admission_reconcile:ledger_stock';
  v_label         constant text := 'Conciliação do livro de admissão';
  v_now       timestamptz := COALESCE(p_now, now());
  v_inv       jsonb;
  v_verdict   text;
  v_severity  text;
  v_reason    text;
  v_cooldown  int;
  v_orphan    bigint;
  v_expired   bigint;
  v_drift     bigint;
  v_deferred  bigint;
  v_accounted bigint;
  v_emitted   int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  v_inv := public.admission_ledger_reconcile(365, v_now);

  IF COALESCE((v_inv->>'ok')::boolean, false) IS NOT true THEN
    RETURN jsonb_build_object(
      'evaluated_at', v_now, 'routine', v_key,
      'verdict', 'indeterminate', 'severity', 'none', 'emitted', 0,
      'refusal', v_inv->>'refusal'
    );
  END IF;

  v_verdict   := v_inv->>'verdict';
  v_expired   := COALESCE((v_inv->>'expired_stock')::bigint, 0);
  v_drift     := COALESCE((v_inv->>'drift_stock')::bigint, 0);
  v_deferred  := COALESCE((v_inv->>'declared_deferred')::bigint, 0);
  v_orphan    := COALESCE((v_inv->>'orphan_count')::bigint, 0);
  v_accounted := v_deferred + v_drift;

  v_severity := public.admission_reconcile_severity(
                  v_verdict,
                  CASE WHEN v_verdict = 'indeterminate'
                       THEN 'inventario_anterior_a_execucao' ELSE NULL END);

  IF v_severity IS NOT NULL THEN
    v_cooldown := public.admission_reconcile_cooldown(cadence_minutes, v_severity);

    v_reason := CASE v_verdict
      WHEN 'unaccounted' THEN
        format('%s: %s janela(s) vencida(s) sem dono — estoque vencido %s, dívida assumida %s (passivo declarado %s + deriva %s), cadência %s min',
               v_label, v_orphan, v_expired, v_accounted, v_deferred, v_drift, cadence_minutes)
      WHEN 'no_run' THEN
        format('%s: %s janela(s) vencida(s) no estoque sem execução legível da rotina — cadência %s min',
               v_label, v_expired, cadence_minutes)
      ELSE
        format('%s: inventário ilegível — estoque não pôde ser conferido, cadência %s min',
               v_label, cadence_minutes)
    END;

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
          'job_name',          'ledger_stock',
          'verdict',           v_verdict,
          'orphan_count',      v_orphan,
          'expired_stock',     v_expired,
          'drift_stock',       v_drift,
          'declared_deferred', v_deferred,
          'accounted_for',     v_accounted,
          'quarantined_stock', COALESCE((v_inv->>'quarantined_stock')::bigint, 0),
          'total_stock',       COALESCE((v_inv->>'total_stock')::bigint, 0),
          'cadence_minutes',   cadence_minutes,
          'cooldown_minutes',  v_cooldown
        ),
        COALESCE((v_inv->>'observed_at')::timestamptz, v_now)
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
    'inventory',    v_inv
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_admission_reconcile_alerts(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_admission_reconcile_alerts(timestamptz) FROM anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('evaluate-admission-reconcile');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'evaluate-admission-reconcile',
  '53 3 * * *',
  $cron$SELECT public.evaluate_admission_reconcile_alerts();$cron$
);