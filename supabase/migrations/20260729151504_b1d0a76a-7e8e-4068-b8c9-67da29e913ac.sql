-- Onda 243 — Guarda de retenção da trilha de supressão (Onda 242).

CREATE TABLE IF NOT EXISTS public.maintenance_suppression_purge_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at           timestamptz NOT NULL DEFAULT now(),
  cutoff_at             timestamptz NOT NULL,
  retention_days        integer NOT NULL CHECK (retention_days BETWEEN 30 AND 730),
  batch_cap             integer NOT NULL CHECK (batch_cap BETWEEN 1 AND 100000),
  anchor_per_condition  integer NOT NULL CHECK (anchor_per_condition BETWEEN 1 AND 1000),
  deleted_count         bigint  NOT NULL CHECK (deleted_count >= 0),
  deferred_count        bigint  NOT NULL CHECK (deferred_count >= 0),
  anchored_count        bigint  NOT NULL CHECK (anchored_count >= 0),
  quarantined_count     bigint  NOT NULL CHECK (quarantined_count >= 0),
  capped                boolean NOT NULL,
  duration_ms           integer NOT NULL CHECK (duration_ms >= 0),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_suppression_purge_runs_recent_idx
  ON public.maintenance_suppression_purge_runs (executed_at DESC);

REVOKE ALL ON public.maintenance_suppression_purge_runs FROM PUBLIC;
REVOKE ALL ON public.maintenance_suppression_purge_runs FROM anon;
REVOKE ALL ON public.maintenance_suppression_purge_runs FROM authenticated;
GRANT SELECT ON public.maintenance_suppression_purge_runs TO authenticated;
GRANT ALL ON public.maintenance_suppression_purge_runs TO service_role;

ALTER TABLE public.maintenance_suppression_purge_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_suppression_purge_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read suppression purge runs"
  ON public.maintenance_suppression_purge_runs;
CREATE POLICY "admins read suppression purge runs"
  ON public.maintenance_suppression_purge_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_block_suppression_purge_run_mutation
  ON public.maintenance_suppression_purge_runs;
CREATE TRIGGER trg_block_suppression_purge_run_mutation
  BEFORE UPDATE OR DELETE ON public.maintenance_suppression_purge_runs
  FOR EACH ROW EXECUTE FUNCTION public.block_retention_run_mutation();

-- Rotina de expurgo (leis T1–T9).
CREATE OR REPLACE FUNCTION public.purge_dispatch_suppressions(
  p_retention_days integer DEFAULT 90,
  p_batch_cap integer DEFAULT 20000,
  p_anchor_per_condition integer DEFAULT 3,
  p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_started     timestamptz := clock_timestamp();
  v_cutoff      timestamptz;
  v_deleted     bigint := 0;
  v_expired     bigint := 0;
  v_anchored    bigint := 0;
  v_quarantined bigint := 0;
  v_deferred    bigint := 0;
BEGIN
  -- T1/T2/T4/T6: parâmetro inválido recusa o expurgo inteiro, sem apagar nada.
  IF p_now IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_now');
  END IF;
  IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 730 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_retention_days');
  END IF;
  IF p_batch_cap IS NULL OR p_batch_cap < 1 OR p_batch_cap > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_batch_cap');
  END IF;
  IF p_anchor_per_condition IS NULL OR p_anchor_per_condition < 1
     OR p_anchor_per_condition > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_anchor_keep');
  END IF;

  v_cutoff := p_now - make_interval(days => p_retention_days);

  -- T5/T9: ilegível é quarentena, nunca lixo. Os CHECKs da tabela barram
  -- condição vazia/canal/janela; sobra o instante no futuro.
  SELECT count(*) INTO v_quarantined
    FROM public.maintenance_dispatch_suppressions
   WHERE suppressed_at IS NULL OR suppressed_at > p_now;

  -- T4: âncora por condição — as N mais recentes de cada condição.
  CREATE TEMP TABLE IF NOT EXISTS _sup_anchor_ids (id bigint PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _sup_anchor_ids;
  INSERT INTO _sup_anchor_ids (id)
  SELECT id FROM (
    SELECT s.id,
           row_number() OVER (
             PARTITION BY s.condition_key
             ORDER BY s.suppressed_at DESC, s.id DESC
           ) AS rn
      FROM public.maintenance_dispatch_suppressions s
     WHERE s.suppressed_at IS NOT NULL AND s.suppressed_at <= p_now
  ) ranked
   WHERE rn <= p_anchor_per_condition;

  SELECT count(*) INTO v_anchored
    FROM public.maintenance_dispatch_suppressions s
    JOIN _sup_anchor_ids a ON a.id = s.id
   WHERE s.suppressed_at < v_cutoff;

  -- T3: empate no corte preserva (`suppressed_at >= cutoff` fica).
  SELECT count(*) INTO v_expired
    FROM public.maintenance_dispatch_suppressions s
   WHERE s.suppressed_at < v_cutoff
     AND NOT EXISTS (SELECT 1 FROM _sup_anchor_ids a WHERE a.id = s.id);

  ALTER TABLE public.maintenance_dispatch_suppressions
    DISABLE TRIGGER trg_block_dispatch_suppression_mutation;
  BEGIN
    WITH doomed AS (
      SELECT s.id
        FROM public.maintenance_dispatch_suppressions s
       WHERE s.suppressed_at < v_cutoff
         AND NOT EXISTS (SELECT 1 FROM _sup_anchor_ids a WHERE a.id = s.id)
       ORDER BY s.suppressed_at ASC, s.id ASC
       LIMIT p_batch_cap
    ), del AS (
      DELETE FROM public.maintenance_dispatch_suppressions t
       USING doomed d
       WHERE t.id = d.id
      RETURNING 1
    )
    SELECT count(*) INTO v_deleted FROM del;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.maintenance_dispatch_suppressions
      ENABLE TRIGGER trg_block_dispatch_suppression_mutation;
    RAISE;
  END;
  ALTER TABLE public.maintenance_dispatch_suppressions
    ENABLE TRIGGER trg_block_dispatch_suppression_mutation;

  v_deferred := GREATEST(0, v_expired - v_deleted);

  INSERT INTO public.maintenance_suppression_purge_runs
    (cutoff_at, retention_days, batch_cap, anchor_per_condition, deleted_count,
     deferred_count, anchored_count, quarantined_count, capped, duration_ms)
  VALUES
    (v_cutoff, p_retention_days, p_batch_cap, p_anchor_per_condition, v_deleted,
     v_deferred, v_anchored, v_quarantined, v_deferred > 0,
     GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int));

  RETURN jsonb_build_object(
    'ok', true,
    'cutoff_at', v_cutoff,
    'retention_days', p_retention_days,
    'batch_cap', p_batch_cap,
    'anchor_per_condition', p_anchor_per_condition,
    'deleted', v_deleted,
    'deferred', v_deferred,
    'anchored', v_anchored,
    'quarantined', v_quarantined,
    'capped', v_deferred > 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_dispatch_suppressions(integer, integer, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_dispatch_suppressions(integer, integer, integer, timestamptz)
  TO service_role;

-- Registro de retenção (Onda 134): sem isto a rotina cresceria sem vigia.
CREATE OR REPLACE FUNCTION public.retention_routine_registry()
 RETURNS TABLE(job_name text, source_table text, cadence_minutes integer, label text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  VALUES
    ('admission_ledger',       'admission_ledger_purge_runs',            1440, 'Janelas do livro de admissão'),
    ('admission_reconcile',    'admission_reconcile_purge_runs',         1440, 'Fotos de conciliação da admissão'),
    ('agent_discoveries',      'agent_discoveries_purge_runs',           1440, 'Descobertas de agentes locais'),
    ('agent_relay_tasks',      'agent_relay_purge_runs',                 1440, 'Tarefas de relay dos agentes'),
    ('alarm_recurrence',       'alarm_recurrence_purge_runs',            1440, 'Episódios de reincidência de alarme'),
    ('collab_entries',         'collab_entry_purge_runs',                1440, 'Entradas da rede colaborativa'),
    ('collab_notifications',   'collab_notification_purge_runs',           60, 'Avisos da rede colaborativa'),
    ('dispatch_suppressions',  'maintenance_suppression_purge_runs',     1440, 'Trilha de silêncios do despacho')
$function$;

-- Autoteste dinâmico (o gate estático não prova execução).
CREATE OR REPLACE FUNCTION public.suppression_retention_selftest()
 RETURNS TABLE(check_name text, passed boolean, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base timestamptz := timestamptz '2099-01-01 00:00:00+00';
  v_now  timestamptz := timestamptz '2099-01-01 00:00:00+00' + interval '400 days';
  v_res  jsonb;
  v_left bigint;
  i      int;
BEGIN
  -- Condição A: 6 supressões antigas (todas vencidas com prazo de 30 dias).
  FOR i IN 1..6 LOOP
    INSERT INTO public.maintenance_dispatch_suppressions
      (condition_key, channel, severity, window_minutes, remaining_minutes, suppressed_at)
    VALUES ('selftest:a', 'telegram', 'warning', 1440, 10, v_base + make_interval(days => i));
  END LOOP;
  -- Condição B: 1 antiga + 1 recente (a recente é âncora e está no prazo).
  INSERT INTO public.maintenance_dispatch_suppressions
    (condition_key, channel, severity, window_minutes, remaining_minutes, suppressed_at)
  VALUES ('selftest:b', 'email', 'critical', 60, 5, v_base + interval '2 days'),
         ('selftest:b', 'email', 'critical', 60, 5, v_now - interval '1 day');
  -- Linha no futuro: ilegível, nunca apagada (T9).
  INSERT INTO public.maintenance_dispatch_suppressions
    (condition_key, channel, severity, window_minutes, remaining_minutes, suppressed_at)
  VALUES ('selftest:c', 'telegram', 'warning', 60, 5, v_now + interval '10 days');

  -- T1/T2/T6/T4: recusas não apagam nada.
  v_res := public.purge_dispatch_suppressions(10, 100, 3, v_now);
  RETURN QUERY SELECT 'recusa_prazo_curto',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_retention_days', v_res::text;
  v_res := public.purge_dispatch_suppressions(900, 100, 3, v_now);
  RETURN QUERY SELECT 'recusa_prazo_longo',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_retention_days', v_res::text;
  v_res := public.purge_dispatch_suppressions(90, 0, 3, v_now);
  RETURN QUERY SELECT 'recusa_teto_zero',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_batch_cap', v_res::text;
  v_res := public.purge_dispatch_suppressions(90, 100, 0, v_now);
  RETURN QUERY SELECT 'recusa_ancora_zero',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_anchor_keep', v_res::text;
  v_res := public.purge_dispatch_suppressions(90, 100, 3, NULL);
  RETURN QUERY SELECT 'recusa_relogio_nulo',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_now', v_res::text;

  SELECT count(*) INTO v_left FROM public.maintenance_dispatch_suppressions
   WHERE condition_key LIKE 'selftest:%';
  RETURN QUERY SELECT 'recusa_nao_apaga', v_left = 9, format('restaram %s de 9', v_left);

  -- T4/T5/T6: teto de lote apaga 1 (a mais antiga) e declara o adiamento.
  v_res := public.purge_dispatch_suppressions(30, 1, 3, v_now);
  RETURN QUERY SELECT 'teto_lote_apaga_um',
    (v_res->>'deleted')::bigint = 1 AND (v_res->>'capped')::boolean IS TRUE
    AND (v_res->>'deferred')::bigint = 2, v_res::text;
  RETURN QUERY SELECT 'teto_lote_mais_antiga_sai',
    NOT EXISTS (SELECT 1 FROM public.maintenance_dispatch_suppressions
                 WHERE condition_key = 'selftest:a'
                   AND suppressed_at = v_base + interval '1 day'),
    'a supressão mais antiga deveria ter saído primeiro';
  RETURN QUERY SELECT 'futuro_em_quarentena',
    (v_res->>'quarantined')::bigint >= 1, v_res::text;

  -- Expurgo completo: sobra a âncora de cada condição + a linha no futuro.
  v_res := public.purge_dispatch_suppressions(30, 1000, 3, v_now);
  SELECT count(*) INTO v_left FROM public.maintenance_dispatch_suppressions
   WHERE condition_key = 'selftest:a';
  RETURN QUERY SELECT 'ancora_por_condicao_a', v_left = 3,
    format('condição A deveria manter 3 âncoras, tem %s', v_left);
  SELECT count(*) INTO v_left FROM public.maintenance_dispatch_suppressions
   WHERE condition_key = 'selftest:b';
  RETURN QUERY SELECT 'ancora_por_condicao_b', v_left = 2,
    format('condição B deveria manter suas 2 linhas, tem %s', v_left);
  SELECT count(*) INTO v_left FROM public.maintenance_dispatch_suppressions
   WHERE condition_key = 'selftest:c';
  RETURN QUERY SELECT 'futuro_nunca_apagado', v_left = 1,
    format('a linha no futuro deveria continuar, tem %s', v_left);

  -- Toda execução, mesmo a que nada apagou, deixa trilha.
  RETURN QUERY SELECT 'trilha_registrada',
    (SELECT count(*) FROM public.maintenance_suppression_purge_runs
      WHERE cutoff_at = v_now - interval '30 days') >= 2,
    'as execuções válidas precisam aparecer na trilha';

  -- Limpeza do que o autoteste criou.
  ALTER TABLE public.maintenance_dispatch_suppressions
    DISABLE TRIGGER trg_block_dispatch_suppression_mutation;
  DELETE FROM public.maintenance_dispatch_suppressions
   WHERE condition_key LIKE 'selftest:%';
  ALTER TABLE public.maintenance_dispatch_suppressions
    ENABLE TRIGGER trg_block_dispatch_suppression_mutation;

  ALTER TABLE public.maintenance_suppression_purge_runs
    DISABLE TRIGGER trg_block_suppression_purge_run_mutation;
  DELETE FROM public.maintenance_suppression_purge_runs
   WHERE cutoff_at = v_now - interval '30 days';
  ALTER TABLE public.maintenance_suppression_purge_runs
    ENABLE TRIGGER trg_block_suppression_purge_run_mutation;
END;
$function$;

REVOKE ALL ON FUNCTION public.suppression_retention_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suppression_retention_selftest() TO service_role;