-- Onda 235 — Histórico persistido das conciliações + tendência do órfão.

CREATE TABLE IF NOT EXISTS public.admission_reconcile_snapshots (
  id                bigserial PRIMARY KEY,
  observed_at       timestamptz NOT NULL,
  verdict           text        NOT NULL,
  orphan_count      bigint      NOT NULL,
  expired_stock     bigint      NOT NULL,
  drift_stock       bigint      NOT NULL,
  declared_deferred bigint      NOT NULL,
  quarantined_stock bigint      NOT NULL,
  total_stock       bigint      NOT NULL,
  retention_days    integer     NOT NULL,
  last_run_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admission_reconcile_snapshots_verdict_chk
    CHECK (verdict IN ('reconciled','settling','no_run','unaccounted','indeterminate')),
  CONSTRAINT admission_reconcile_snapshots_counts_chk
    CHECK (orphan_count >= 0 AND expired_stock >= 0 AND drift_stock >= 0
           AND declared_deferred >= 0 AND quarantined_stock >= 0 AND total_stock >= 0),
  CONSTRAINT admission_reconcile_snapshots_retention_chk
    CHECK (retention_days BETWEEN 30 AND 3650),
  -- Órfão nunca pode exceder o estoque vencido que o originou.
  CONSTRAINT admission_reconcile_snapshots_orphan_chk
    CHECK (orphan_count <= expired_stock)
);

CREATE INDEX IF NOT EXISTS admission_reconcile_snapshots_recent_idx
  ON public.admission_reconcile_snapshots (observed_at DESC, id DESC);

-- Sem Data API: o histórico só é lido por rotina SECURITY DEFINER.
REVOKE ALL ON TABLE public.admission_reconcile_snapshots FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admission_reconcile_snapshots TO service_role;
REVOKE ALL ON SEQUENCE public.admission_reconcile_snapshots_id_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE public.admission_reconcile_snapshots_id_seq TO service_role;

ALTER TABLE public.admission_reconcile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_reconcile_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconcile snapshots são inacessíveis por Data API"
  ON public.admission_reconcile_snapshots;
CREATE POLICY "reconcile snapshots são inacessíveis por Data API"
  ON public.admission_reconcile_snapshots
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Append-only: UPDATE/DELETE são recusados no gatilho, não só por privilégio.
CREATE OR REPLACE FUNCTION public.block_reconcile_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'admission_reconcile_snapshots é append-only (% recusado)', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_reconcile_snapshot_mutation
  ON public.admission_reconcile_snapshots;
CREATE TRIGGER trg_block_reconcile_snapshot_mutation
  BEFORE UPDATE OR DELETE ON public.admission_reconcile_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.block_reconcile_snapshot_mutation();

-- ---------------------------------------------------------------------------
-- Espelho SQL das leis L2–L6: classifica uma série do mais antigo ao mais novo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_orphan_trend_classify(p_series bigint[])
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  persist_samples constant int := 3;
  v_list  bigint[] := '{}';
  v_el    bigint;
  v_n     int;
  v_start int;
  v_block bigint[] := '{}';
  v_up    boolean := true;
  v_down  boolean := true;
  i       int;
BEGIN
  IF p_series IS NULL THEN RETURN 'no_history'; END IF;

  -- Higiene: só inteiros >= 0 entram (paridade com o filtro da régua TS).
  FOREACH v_el IN ARRAY p_series LOOP
    IF v_el IS NOT NULL AND v_el >= 0 THEN
      v_list := v_list || v_el;
    END IF;
  END LOOP;

  v_n := COALESCE(array_length(v_list, 1), 0);
  IF v_n = 0 THEN RETURN 'no_history'; END IF;
  IF v_list[v_n] = 0 THEN RETURN 'clear'; END IF;   -- L2

  v_start := v_n;
  WHILE v_start - 1 >= 1 AND v_list[v_start - 1] > 0 LOOP
    v_start := v_start - 1;
  END LOOP;
  v_block := v_list[v_start:v_n];

  IF array_length(v_block, 1) < persist_samples THEN RETURN 'emerging'; END IF;  -- L3

  FOR i IN 2..array_length(v_block, 1) LOOP
    IF v_block[i] <= v_block[i - 1] THEN v_up := false; END IF;
    IF v_block[i] >= v_block[i - 1] THEN v_down := false; END IF;
  END LOOP;

  IF v_up   THEN RETURN 'growing';   END IF;  -- L4
  IF v_down THEN RETURN 'resolving'; END IF;  -- L5
  RETURN 'persistent';                        -- L6
END;
$$;

REVOKE ALL ON FUNCTION public.admission_orphan_trend_classify(bigint[]) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leitura do histórico: devolve a série e o veredito já classificado.
-- Somente admin (a tabela não tem Data API).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admission_orphan_trend(p_window integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window int := GREATEST(1, LEAST(365, COALESCE(p_window, 14)));
  v_series bigint[];
  v_last   timestamptz;
  v_n      int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'apenas administradores podem ler a tendência de órfão'
      USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(orphan_count ORDER BY observed_at ASC, id ASC),
         max(observed_at),
         count(*)
    INTO v_series, v_last, v_n
  FROM (
    SELECT id, observed_at, orphan_count
      FROM public.admission_reconcile_snapshots
     ORDER BY observed_at DESC, id DESC
     LIMIT v_window
  ) t;

  RETURN jsonb_build_object(
    'window',        v_window,
    'readable',      COALESCE(v_n, 0),
    'series',        COALESCE(to_jsonb(v_series), '[]'::jsonb),
    'last_observed_at', v_last,
    'verdict',       public.admission_orphan_trend_classify(COALESCE(v_series, '{}'::bigint[]))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admission_orphan_trend(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admission_orphan_trend(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- A conciliação diária passa a gravar sua foto antes de decidir sobre alerta.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_admission_reconcile_snapshot(
  p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := COALESCE(p_now, now());
  v_inv jsonb;
BEGIN
  v_inv := public.admission_ledger_reconcile(365, v_now);

  IF COALESCE((v_inv->>'ok')::boolean, false) IS NOT true THEN
    RETURN jsonb_build_object('recorded', false, 'refusal', v_inv->>'refusal');
  END IF;

  INSERT INTO public.admission_reconcile_snapshots (
    observed_at, verdict, orphan_count, expired_stock, drift_stock,
    declared_deferred, quarantined_stock, total_stock, retention_days, last_run_at
  ) VALUES (
    COALESCE((v_inv->>'observed_at')::timestamptz, v_now),
    v_inv->>'verdict',
    COALESCE((v_inv->>'orphan_count')::bigint, 0),
    COALESCE((v_inv->>'expired_stock')::bigint, 0),
    COALESCE((v_inv->>'drift_stock')::bigint, 0),
    COALESCE((v_inv->>'declared_deferred')::bigint, 0),
    COALESCE((v_inv->>'quarantined_stock')::bigint, 0),
    COALESCE((v_inv->>'total_stock')::bigint, 0),
    COALESCE((v_inv->>'retention_days')::int, 365),
    (v_inv->>'last_run_at')::timestamptz
  );

  RETURN jsonb_build_object('recorded', true, 'verdict', v_inv->>'verdict',
                            'orphan_count', COALESCE((v_inv->>'orphan_count')::bigint, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.record_admission_reconcile_snapshot(timestamptz) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('record-admission-reconcile-snapshot');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'record-admission-reconcile-snapshot',
  '51 3 * * *',
  $cron$SELECT public.record_admission_reconcile_snapshot();$cron$
);