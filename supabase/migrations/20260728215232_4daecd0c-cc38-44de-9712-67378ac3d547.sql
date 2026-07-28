-- Onda 233 — Conciliação estoque × trilha do livro de admissão.
-- Espelho SQL de src/lib/alarms/admissionReconciliation.ts (leis J1–J8).

CREATE OR REPLACE FUNCTION public.admission_reconcile_classify(
  p_readable boolean,
  p_has_run  boolean,
  p_stale    boolean,
  p_expired  bigint,
  p_drift    bigint,
  p_deferred bigint
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_expired   bigint := COALESCE(p_expired, 0);
  v_drift     bigint := COALESCE(p_drift, 0);
  v_deferred  bigint := COALESCE(p_deferred, 0);
  v_accounted bigint;
BEGIN
  -- J1 — inventário ilegível nunca é conciliado.
  IF p_readable IS DISTINCT FROM true THEN RETURN 'indeterminate'; END IF;

  -- J3 — sem execução legível não se acusa contabilidade.
  IF p_has_run IS DISTINCT FROM true THEN
    IF v_expired = 0 THEN RETURN 'reconciled'; END IF;
    RETURN 'no_run';
  END IF;

  -- J2 — foto anterior à execução é obsoleta.
  IF p_stale IS true THEN RETURN 'indeterminate'; END IF;

  v_accounted := v_deferred + v_drift;

  IF v_expired > v_accounted THEN RETURN 'unaccounted'; END IF;  -- J5
  IF v_expired < v_accounted THEN RETURN 'settling';    END IF;  -- J6
  RETURN 'reconciled';
END;
$$;

REVOKE ALL ON FUNCTION public.admission_reconcile_classify(boolean, boolean, boolean, bigint, bigint, bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admission_ledger_reconcile(
  p_retention_days integer DEFAULT 365,
  p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now         timestamptz := COALESCE(p_now, now());
  v_days        integer;
  v_cutoff      timestamptz;
  v_run         record;
  v_expired     bigint := 0;
  v_drift       bigint := 0;
  v_quarantined bigint := 0;
  v_total       bigint := 0;
  v_stale       boolean := false;
  v_has_run     boolean := false;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 3650 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_retention_days');
  END IF;
  v_days := p_retention_days;
  v_cutoff := v_now - make_interval(days => v_days);

  -- Última execução VÁLIDA (mesmas guardas da leitura em TS, Onda 231).
  SELECT r.executed_at, r.cutoff_at, r.deferred_count
    INTO v_run
  FROM public.admission_ledger_purge_runs r
  WHERE r.executed_at IS NOT NULL
    AND r.batch_cap >= 1
    AND r.retention_days >= 1
    AND r.deleted_count <= r.batch_cap
    AND r.capped = (r.deferred_count > 0)
    AND r.cutoff_at <= r.executed_at
  ORDER BY r.executed_at DESC, r.id DESC
  LIMIT 1;

  v_has_run := v_run.executed_at IS NOT NULL;
  -- J2 — o inventário é tirado agora; só é obsoleto se a execução for futura.
  v_stale := v_has_run AND v_now < v_run.executed_at;

  SELECT count(*) INTO v_total FROM public.admission_ledger_windows;

  -- J7 — quarentena: linha estruturalmente ilegível, que o expurgo nunca apaga.
  SELECT count(*) INTO v_quarantined
    FROM public.admission_ledger_windows w
   WHERE w.window_end IS NULL
      OR w.window_start IS NULL
      OR w.window_end <= w.window_start
      OR btrim(w.source_id) = '';

  -- Estoque vencido legível: exatamente o alvo do expurgo.
  SELECT count(*) INTO v_expired
    FROM public.admission_ledger_windows w
   WHERE w.window_end < v_cutoff
     AND w.window_start IS NOT NULL
     AND w.window_end > w.window_start
     AND btrim(w.source_id) <> '';

  -- J4 — deriva: venceu DEPOIS do corte da última execução, logo não podia
  -- ter sido apagada por ela. Medida, nunca estimada.
  IF v_has_run AND v_run.cutoff_at IS NOT NULL THEN
    SELECT count(*) INTO v_drift
      FROM public.admission_ledger_windows w
     WHERE w.window_end < v_cutoff
       AND w.window_end >= v_run.cutoff_at
       AND w.window_start IS NOT NULL
       AND w.window_end > w.window_start
       AND btrim(w.source_id) <> '';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'verdict', public.admission_reconcile_classify(
                 true, v_has_run, v_stale, v_expired, v_drift,
                 COALESCE(v_run.deferred_count, 0)),
    'observed_at',        v_now,
    'cutoff_at',          v_cutoff,
    'retention_days',     v_days,
    'expired_stock',      v_expired,
    'drift_stock',        v_drift,
    'quarantined_stock',  v_quarantined,
    'total_stock',        v_total,
    'declared_deferred',  COALESCE(v_run.deferred_count, 0),
    'last_run_at',        v_run.executed_at,
    'orphan_count',       CASE
                            WHEN v_has_run AND NOT v_stale
                             AND v_expired > COALESCE(v_run.deferred_count, 0) + v_drift
                            THEN v_expired - (COALESCE(v_run.deferred_count, 0) + v_drift)
                            ELSE 0
                          END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admission_ledger_reconcile(integer, timestamptz) FROM PUBLIC, anon, authenticated;