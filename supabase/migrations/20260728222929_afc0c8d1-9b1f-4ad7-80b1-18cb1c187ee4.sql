CREATE OR REPLACE FUNCTION public.reconcile_retention_selftest()
RETURNS TABLE(check_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base timestamptz := timestamptz '2099-01-01 00:00:00+00';
  v_now  timestamptz := timestamptz '2099-01-01 00:00:00+00' + interval '2000 days';
  v_res  jsonb;
  v_left bigint;
  i      int;
BEGIN
  FOR i IN 1..12 LOOP
    INSERT INTO public.admission_reconcile_snapshots
      (observed_at, verdict, orphan_count, expired_stock, drift_stock,
       declared_deferred, quarantined_stock, total_stock, retention_days)
    VALUES (v_base + make_interval(days => i), 'reconciled', 0, 0, 0, 0, 0, 0, 365);
  END LOOP;
  INSERT INTO public.admission_reconcile_snapshots
    (observed_at, verdict, orphan_count, expired_stock, drift_stock,
     declared_deferred, quarantined_stock, total_stock, retention_days)
  VALUES
    (v_now - interval '730 days', 'settling', 0, 0, 0, 0, 0, 0, 365),
    (v_now - interval '1 day',    'reconciled', 0, 0, 0, 0, 0, 0, 365);

  -- N1/N2/N6: recusas não apagam nada.
  v_res := public.purge_admission_reconcile_snapshots(10, 100, 7, v_now);
  RETURN QUERY SELECT 'recusa_prazo_curto',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_retention_days', v_res::text;
  v_res := public.purge_admission_reconcile_snapshots(4000, 100, 7, v_now);
  RETURN QUERY SELECT 'recusa_prazo_longo',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_retention_days', v_res::text;
  v_res := public.purge_admission_reconcile_snapshots(730, 0, 7, v_now);
  RETURN QUERY SELECT 'recusa_teto_zero',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_batch_cap', v_res::text;
  v_res := public.purge_admission_reconcile_snapshots(730, 100, 0, v_now);
  RETURN QUERY SELECT 'recusa_ancora_zero',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_anchor_keep', v_res::text;
  v_res := public.purge_admission_reconcile_snapshots(730, 100, 7, NULL);
  RETURN QUERY SELECT 'recusa_relogio_nulo',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_now', v_res::text;

  SELECT count(*) INTO v_left FROM public.admission_reconcile_snapshots
   WHERE observed_at >= v_base;
  RETURN QUERY SELECT 'recusa_nao_apaga', v_left = 14, format('restaram %s de 14', v_left);

  -- N4: âncora ampla (14) cobre a série inteira — nada pode ser apagado, e o
  -- que estava vencido aparece declarado como `anchored`, nunca escondido.
  v_res := public.purge_admission_reconcile_snapshots(730, 1000, 14, v_now);
  RETURN QUERY SELECT 'ancora_ampla_nao_apaga',
    (v_res->>'deleted')::bigint = 0 AND (v_res->>'anchored')::bigint = 12
    AND (v_res->>'capped')::boolean IS FALSE, v_res::text;
  SELECT count(*) INTO v_left FROM public.admission_reconcile_snapshots
   WHERE observed_at >= v_base;
  RETURN QUERY SELECT 'ancora_ampla_preservou', v_left = 14, format('restaram %s de 14', v_left);

  -- N6: teto de lote apaga a mais antiga primeiro e declara o adiamento.
  v_res := public.purge_admission_reconcile_snapshots(730, 1, 2, v_now);
  RETURN QUERY SELECT 'teto_lote_apaga_um',
    (v_res->>'deleted')::bigint = 1 AND (v_res->>'capped')::boolean IS TRUE
    AND (v_res->>'deferred')::bigint = 11, v_res::text;
  RETURN QUERY SELECT 'teto_lote_mais_antiga_sai',
    NOT EXISTS (SELECT 1 FROM public.admission_reconcile_snapshots
                 WHERE observed_at = v_base + interval '1 day'),
    'a foto mais antiga deveria ter saído primeiro';

  -- Âncora estreita (2): as duas mais recentes da tabela são justamente a do
  -- corte e a recente, ambas já protegidas pelo prazo — logo `anchored` = 0 e
  -- a série vencida sai inteira. A âncora nunca *cria* sobrevivente extra.
  v_res := public.purge_admission_reconcile_snapshots(730, 1000, 2, v_now);
  RETURN QUERY SELECT 'segunda_rodada_limpa',
    (v_res->>'deleted')::bigint = 11 AND (v_res->>'anchored')::bigint = 0
    AND (v_res->>'capped')::boolean IS FALSE, v_res::text;
  SELECT count(*) INTO v_left FROM public.admission_reconcile_snapshots
   WHERE observed_at >= v_base;
  RETURN QUERY SELECT 'sobreviventes_esperados', v_left = 2,
    format('esperava 2 (corte + recente), veio %s', v_left);

  RETURN QUERY SELECT 'fronteira_preservada',
    EXISTS (SELECT 1 FROM public.admission_reconcile_snapshots
             WHERE observed_at = v_now - interval '730 days'),
    'empate no corte deve preservar';
  RETURN QUERY SELECT 'recente_preservada',
    EXISTS (SELECT 1 FROM public.admission_reconcile_snapshots
             WHERE observed_at = v_now - interval '1 day'),
    'foto recente deve preservar';

  v_res := public.purge_admission_reconcile_snapshots(730, 1000, 2, v_now);
  RETURN QUERY SELECT 'idempotente', (v_res->>'deleted')::bigint = 0, v_res::text;

  BEGIN
    DELETE FROM public.admission_reconcile_snapshots WHERE observed_at >= v_base;
    RETURN QUERY SELECT 'append_only_mantido', false, 'DELETE direto passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'append_only_mantido', true, SQLERRM;
  END;

  RETURN QUERY SELECT 'trilha_registrada',
    (SELECT count(*) FROM public.admission_reconcile_purge_runs
      WHERE cutoff_at = v_now - interval '730 days') >= 4,
    'esperava >= 4 execuções registradas';

  BEGIN
    UPDATE public.admission_reconcile_purge_runs SET deleted_count = 0
     WHERE cutoff_at = v_now - interval '730 days';
    RETURN QUERY SELECT 'trilha_imutavel', false, 'UPDATE na trilha passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trilha_imutavel', true, SQLERRM;
  END;

  ALTER TABLE public.admission_reconcile_snapshots
    DISABLE TRIGGER trg_block_reconcile_snapshot_mutation;
  DELETE FROM public.admission_reconcile_snapshots WHERE observed_at >= v_base;
  ALTER TABLE public.admission_reconcile_snapshots
    ENABLE TRIGGER trg_block_reconcile_snapshot_mutation;

  ALTER TABLE public.admission_reconcile_purge_runs DISABLE TRIGGER reconcile_purge_runs_immutable;
  DELETE FROM public.admission_reconcile_purge_runs
   WHERE cutoff_at = v_now - interval '730 days';
  ALTER TABLE public.admission_reconcile_purge_runs ENABLE TRIGGER reconcile_purge_runs_immutable;
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_retention_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_retention_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.reconcile_retention_selftest() FROM authenticated;