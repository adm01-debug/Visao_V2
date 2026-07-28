CREATE OR REPLACE FUNCTION public.admission_retention_selftest()
RETURNS TABLE(check_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := gen_random_uuid();
  v_now  timestamptz := timestamptz '2026-07-28 12:00:00+00';
  v_res  jsonb;
  v_left bigint;
BEGIN
  INSERT INTO public.admission_ledger_windows
    (user_id, source_id, window_start, window_end, counts, total, admitted)
  VALUES
    (v_user, 'sel-600', v_now - interval '600 days', v_now - interval '600 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-500', v_now - interval '500 days', v_now - interval '500 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-400', v_now - interval '400 days', v_now - interval '400 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-edge', v_now - interval '365 days' - interval '1 hour', v_now - interval '365 days', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-new', v_now - interval '1 hour', v_now, '{"admitted":1}'::jsonb, 1, 1);

  v_res := public.purge_admission_ledger(10, 100, v_now);
  RETURN QUERY SELECT 'refusa_prazo_curto',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_retention_days', v_res::text;
  v_res := public.purge_admission_ledger(4000, 100, v_now);
  RETURN QUERY SELECT 'refusa_prazo_longo', (v_res->>'ok')::boolean IS FALSE, v_res::text;
  v_res := public.purge_admission_ledger(365, 0, v_now);
  RETURN QUERY SELECT 'refusa_teto_zero',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_batch_cap', v_res::text;
  v_res := public.purge_admission_ledger(365, 100, NULL);
  RETURN QUERY SELECT 'refusa_relogio_nulo',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_now', v_res::text;

  SELECT count(*) INTO v_left FROM public.admission_ledger_windows WHERE user_id = v_user;
  RETURN QUERY SELECT 'recusa_nao_apaga', v_left = 5, format('restaram %s de 5', v_left);

  v_res := public.purge_admission_ledger(365, 1, v_now);
  RETURN QUERY SELECT 'teto_lote_apaga_um',
    (v_res->>'deleted')::bigint = 1 AND (v_res->>'capped')::boolean IS TRUE, v_res::text;
  RETURN QUERY SELECT 'teto_lote_apaga_mais_antiga',
    NOT EXISTS (SELECT 1 FROM public.admission_ledger_windows WHERE user_id = v_user AND source_id = 'sel-600'),
    'sel-600 deveria ter saído primeiro';

  v_res := public.purge_admission_ledger(365, 1000, v_now);
  RETURN QUERY SELECT 'segunda_rodada_limpa',
    (v_res->>'deleted')::bigint = 2 AND (v_res->>'capped')::boolean IS FALSE, v_res::text;
  RETURN QUERY SELECT 'fronteira_preservada',
    EXISTS (SELECT 1 FROM public.admission_ledger_windows WHERE user_id = v_user AND source_id = 'sel-edge'),
    'empate no corte deve preservar';
  RETURN QUERY SELECT 'recente_preservada',
    EXISTS (SELECT 1 FROM public.admission_ledger_windows WHERE user_id = v_user AND source_id = 'sel-new'),
    'janela recente deve preservar';

  v_res := public.purge_admission_ledger(365, 1000, v_now);
  RETURN QUERY SELECT 'idempotente', (v_res->>'deleted')::bigint = 0, v_res::text;

  BEGIN
    DELETE FROM public.admission_ledger_windows WHERE user_id = v_user;
    RETURN QUERY SELECT 'append_only_mantido', false, 'DELETE direto passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'append_only_mantido', true, SQLERRM;
  END;

  RETURN QUERY SELECT 'trilha_registrada',
    (SELECT count(*) FROM public.admission_ledger_purge_runs
      WHERE cutoff_at = v_now - interval '365 days') >= 3,
    'esperava >= 3 execuções registradas';

  BEGIN
    UPDATE public.admission_ledger_purge_runs SET deleted_count = 0
     WHERE cutoff_at = v_now - interval '365 days';
    RETURN QUERY SELECT 'trilha_imutavel', false, 'UPDATE na trilha passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trilha_imutavel', true, SQLERRM;
  END;

  -- Limpeza: o autoteste não pode deixar resíduo nem no livro nem na trilha.
  PERFORM set_config('app.admission_purge', 'on', true);
  DELETE FROM public.admission_ledger_windows WHERE user_id = v_user;
  PERFORM set_config('app.admission_purge', 'off', true);

  ALTER TABLE public.admission_ledger_purge_runs DISABLE TRIGGER admission_purge_runs_immutable;
  DELETE FROM public.admission_ledger_purge_runs
   WHERE cutoff_at = v_now - interval '365 days';
  ALTER TABLE public.admission_ledger_purge_runs ENABLE TRIGGER admission_purge_runs_immutable;
END;
$function$;

REVOKE ALL ON FUNCTION public.admission_retention_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admission_retention_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.admission_retention_selftest() FROM authenticated;