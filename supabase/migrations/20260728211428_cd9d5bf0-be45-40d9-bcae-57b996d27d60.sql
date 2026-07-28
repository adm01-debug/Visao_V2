-- ============================================================================
-- Onda 230 — Guarda de retenção do livro de admissão (espelho SQL das leis G1–G8)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admission_ledger_purge_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at       timestamptz NOT NULL DEFAULT now(),
  cutoff_at         timestamptz NOT NULL,
  retention_days    integer     NOT NULL,
  batch_cap         integer     NOT NULL,
  deleted_count     bigint      NOT NULL DEFAULT 0,
  deferred_count    bigint      NOT NULL DEFAULT 0,
  quarantined_count bigint      NOT NULL DEFAULT 0,
  capped            boolean     NOT NULL DEFAULT false,
  duration_ms       integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admission_purge_days_range  CHECK (retention_days BETWEEN 30 AND 3650),
  CONSTRAINT admission_purge_cap_range   CHECK (batch_cap BETWEEN 1 AND 500000),
  CONSTRAINT admission_purge_nonnegative CHECK (
    deleted_count >= 0 AND deferred_count >= 0 AND quarantined_count >= 0 AND duration_ms >= 0
  ),
  -- G6: `capped` é derivado, nunca opinião de quem escreve.
  CONSTRAINT admission_purge_capped_mirror CHECK (capped = (deferred_count > 0)),
  -- G6: o lote nunca pode exceder o teto declarado.
  CONSTRAINT admission_purge_cap_respected CHECK (deleted_count <= batch_cap)
);

CREATE INDEX IF NOT EXISTS idx_admission_purge_runs_executed_at
  ON public.admission_ledger_purge_runs (executed_at DESC);

-- Default privileges do papel `postgres` concedem tudo a anon: revogar sempre.
REVOKE ALL ON public.admission_ledger_purge_runs FROM anon;
REVOKE ALL ON public.admission_ledger_purge_runs FROM authenticated;
GRANT SELECT ON public.admission_ledger_purge_runs TO authenticated;
GRANT ALL    ON public.admission_ledger_purge_runs TO service_role;

ALTER TABLE public.admission_ledger_purge_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admission_purge_runs_admin_select" ON public.admission_ledger_purge_runs;
CREATE POLICY "admission_purge_runs_admin_select"
  ON public.admission_ledger_purge_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trilha imutável: reaproveita o bloqueio já usado pelas demais rotinas.
DROP TRIGGER IF EXISTS admission_purge_runs_immutable ON public.admission_ledger_purge_runs;
CREATE TRIGGER admission_purge_runs_immutable
  BEFORE UPDATE OR DELETE ON public.admission_ledger_purge_runs
  FOR EACH ROW EXECUTE FUNCTION public.block_retention_run_mutation();

-- ----------------------------------------------------------------------------
-- Rotina de expurgo — espelho fiel de planAdmissionPurge()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_admission_ledger(
  p_retention_days integer     DEFAULT 365,
  p_batch_cap      integer     DEFAULT 50000,
  p_now            timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_started   timestamptz := clock_timestamp();
  v_cutoff    timestamptz;
  v_deleted   bigint := 0;
  v_deferred  bigint := 0;
  v_quarantined bigint := 0;
  v_expired   bigint := 0;
BEGIN
  -- G1: sem instante declarado, nada é apagado.
  IF p_now IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_now');
  END IF;
  -- G5: prazo fora da faixa recusa o expurgo inteiro.
  IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 3650 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_retention_days');
  END IF;
  -- G6: teto obrigatório dentro da faixa.
  IF p_batch_cap IS NULL OR p_batch_cap < 1 OR p_batch_cap > 500000 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_batch_cap');
  END IF;

  v_cutoff := p_now - make_interval(days => p_retention_days);

  -- G4: linha ilegível (janela invertida/origem em branco) é contada, nunca apagada.
  -- Os CHECKs da tabela impedem essas linhas hoje; a contagem existe para que
  -- uma réplica antiga ou uma migração futura não passe despercebida.
  SELECT count(*) INTO v_quarantined
    FROM public.admission_ledger_windows
   WHERE window_end IS NULL
      OR window_start IS NULL
      OR window_end <= window_start
      OR btrim(source_id) = '';

  -- G2/G3: prazo conta pelo fim da janela; empate no corte preserva.
  SELECT count(*) INTO v_expired
    FROM public.admission_ledger_windows
   WHERE window_end < v_cutoff
     AND window_start IS NOT NULL
     AND window_end > window_start
     AND btrim(source_id) <> '';

  -- G6: os mais antigos saem primeiro, até o teto do lote.
  WITH doomed AS (
    SELECT id
      FROM public.admission_ledger_windows
     WHERE window_end < v_cutoff
       AND window_start IS NOT NULL
       AND window_end > window_start
       AND btrim(source_id) <> ''
     ORDER BY window_end ASC, id ASC
     LIMIT p_batch_cap
  ), del AS (
    DELETE FROM public.admission_ledger_windows w
     USING doomed d
     WHERE w.id = d.id
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  v_deferred := GREATEST(0, v_expired - v_deleted);

  INSERT INTO public.admission_ledger_purge_runs
    (cutoff_at, retention_days, batch_cap, deleted_count, deferred_count,
     quarantined_count, capped, duration_ms)
  VALUES
    (v_cutoff, p_retention_days, p_batch_cap, v_deleted, v_deferred,
     v_quarantined, v_deferred > 0,
     GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int));

  RETURN jsonb_build_object(
    'ok', true,
    'cutoff_at', v_cutoff,
    'retention_days', p_retention_days,
    'batch_cap', p_batch_cap,
    'deleted', v_deleted,
    'deferred', v_deferred,
    'quarantined', v_quarantined,
    'capped', v_deferred > 0
  );
END;
$function$;

-- Motor interno: não é API pública do PostgREST.
REVOKE ALL ON FUNCTION public.purge_admission_ledger(integer, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_admission_ledger(integer, integer, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.purge_admission_ledger(integer, integer, timestamptz) FROM authenticated;

-- Trigger de imutabilidade precisa deixar o expurgo passar? Não: o bloqueio de
-- mutação do livro é BEFORE DELETE. A rotina roda como owner, então liberamos
-- o expurgo por sinalização de sessão, no mesmo padrão da Onda 184.
CREATE OR REPLACE FUNCTION public.block_admission_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('app.admission_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'admission_ledger_windows é append-only (operação: %)', TG_OP
    USING ERRCODE = '42501';
END;
$function$;

-- A licença de expurgo é concedida apenas dentro da própria rotina.
CREATE OR REPLACE FUNCTION public.purge_admission_ledger(
  p_retention_days integer     DEFAULT 365,
  p_batch_cap      integer     DEFAULT 50000,
  p_now            timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_started     timestamptz := clock_timestamp();
  v_cutoff      timestamptz;
  v_deleted     bigint := 0;
  v_deferred    bigint := 0;
  v_quarantined bigint := 0;
  v_expired     bigint := 0;
  v_result      jsonb;
BEGIN
  IF p_now IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_now');
  END IF;
  IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 3650 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_retention_days');
  END IF;
  IF p_batch_cap IS NULL OR p_batch_cap < 1 OR p_batch_cap > 500000 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_batch_cap');
  END IF;

  v_cutoff := p_now - make_interval(days => p_retention_days);

  SELECT count(*) INTO v_quarantined
    FROM public.admission_ledger_windows
   WHERE window_end IS NULL
      OR window_start IS NULL
      OR window_end <= window_start
      OR btrim(source_id) = '';

  SELECT count(*) INTO v_expired
    FROM public.admission_ledger_windows
   WHERE window_end < v_cutoff
     AND window_start IS NOT NULL
     AND window_end > window_start
     AND btrim(source_id) <> '';

  PERFORM set_config('app.admission_purge', 'on', true);

  WITH doomed AS (
    SELECT id
      FROM public.admission_ledger_windows
     WHERE window_end < v_cutoff
       AND window_start IS NOT NULL
       AND window_end > window_start
       AND btrim(source_id) <> ''
     ORDER BY window_end ASC, id ASC
     LIMIT p_batch_cap
  ), del AS (
    DELETE FROM public.admission_ledger_windows w
     USING doomed d
     WHERE w.id = d.id
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  PERFORM set_config('app.admission_purge', 'off', true);

  v_deferred := GREATEST(0, v_expired - v_deleted);

  INSERT INTO public.admission_ledger_purge_runs
    (cutoff_at, retention_days, batch_cap, deleted_count, deferred_count,
     quarantined_count, capped, duration_ms)
  VALUES
    (v_cutoff, p_retention_days, p_batch_cap, v_deleted, v_deferred,
     v_quarantined, v_deferred > 0,
     GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int));

  v_result := jsonb_build_object(
    'ok', true,
    'cutoff_at', v_cutoff,
    'retention_days', p_retention_days,
    'batch_cap', p_batch_cap,
    'deleted', v_deleted,
    'deferred', v_deferred,
    'quarantined', v_quarantined,
    'capped', v_deferred > 0
  );
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_admission_ledger(integer, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_admission_ledger(integer, integer, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.purge_admission_ledger(integer, integer, timestamptz) FROM authenticated;

-- ----------------------------------------------------------------------------
-- Registro de retenção: a rotina passa a ser vigiada pelo painel/fan-in
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retention_routine_registry()
RETURNS TABLE(job_name text, source_table text, cadence_minutes integer, label text)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  VALUES
    ('admission_ledger',   'admission_ledger_purge_runs',       1440, 'Janelas do livro de admissão'),
    ('agent_discoveries',  'agent_discoveries_purge_runs',      1440, 'Descobertas de agentes locais'),
    ('agent_relay_tasks',  'agent_relay_purge_runs',            1440, 'Tarefas de relay dos agentes'),
    ('alarm_recurrence',   'alarm_recurrence_purge_runs',       1440, 'Episódios de reincidência de alarme'),
    ('collab_entries',     'collab_entry_purge_runs',           1440, 'Entradas da rede colaborativa'),
    ('collab_notifications','collab_notification_purge_runs',     60, 'Avisos da rede colaborativa')
$function$;

-- ----------------------------------------------------------------------------
-- Autoteste dinâmico: gate estático não prova execução (lição da Onda 141)
-- ----------------------------------------------------------------------------
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
  -- Semeadura: 3 vencidas (400d, 500d, 600d) + 1 na fronteira + 1 recente.
  INSERT INTO public.admission_ledger_windows
    (user_id, source_id, window_start, window_end, counts, total, admitted)
  VALUES
    (v_user, 'sel-600', v_now - interval '600 days', v_now - interval '600 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-500', v_now - interval '500 days', v_now - interval '500 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-400', v_now - interval '400 days', v_now - interval '400 days' + interval '1 hour', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-edge', v_now - interval '365 days' - interval '1 hour', v_now - interval '365 days', '{"admitted":1}'::jsonb, 1, 1),
    (v_user, 'sel-new', v_now - interval '1 hour', v_now, '{"admitted":1}'::jsonb, 1, 1);

  -- G5/G6: parâmetro fora da faixa recusa sem apagar nada.
  v_res := public.purge_admission_ledger(10, 100, v_now);
  RETURN QUERY SELECT 'refusa_prazo_curto',
    (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_retention_days',
    v_res::text;
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

  -- G6: teto de lote — apaga só a mais antiga e adia o resto.
  v_res := public.purge_admission_ledger(365, 1, v_now);
  RETURN QUERY SELECT 'teto_lote_apaga_um',
    (v_res->>'deleted')::bigint = 1 AND (v_res->>'capped')::boolean IS TRUE,
    v_res::text;
  RETURN QUERY SELECT 'teto_lote_apaga_mais_antiga',
    NOT EXISTS (SELECT 1 FROM public.admission_ledger_windows WHERE user_id = v_user AND source_id = 'sel-600'),
    'sel-600 deveria ter saído primeiro';

  -- G2/G3: segunda rodada limpa o restante vencido, preserva fronteira e recente.
  v_res := public.purge_admission_ledger(365, 1000, v_now);
  RETURN QUERY SELECT 'segunda_rodada_limpa',
    (v_res->>'deleted')::bigint = 2 AND (v_res->>'capped')::boolean IS FALSE, v_res::text;
  RETURN QUERY SELECT 'fronteira_preservada',
    EXISTS (SELECT 1 FROM public.admission_ledger_windows WHERE user_id = v_user AND source_id = 'sel-edge'),
    'empate no corte deve preservar';
  RETURN QUERY SELECT 'recente_preservada',
    EXISTS (SELECT 1 FROM public.admission_ledger_windows WHERE user_id = v_user AND source_id = 'sel-new'),
    'janela recente deve preservar';

  -- Idempotência: rodar de novo não apaga nada.
  v_res := public.purge_admission_ledger(365, 1000, v_now);
  RETURN QUERY SELECT 'idempotente', (v_res->>'deleted')::bigint = 0, v_res::text;

  -- Append-only continua valendo fora da rotina.
  BEGIN
    DELETE FROM public.admission_ledger_windows WHERE user_id = v_user;
    RETURN QUERY SELECT 'append_only_mantido', false, 'DELETE direto passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'append_only_mantido', true, SQLERRM;
  END;

  -- Trilha de execução registrada e imutável.
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

  -- Limpeza integral do que o autoteste criou.
  PERFORM set_config('app.admission_purge', 'on', true);
  DELETE FROM public.admission_ledger_windows WHERE user_id = v_user;
  PERFORM set_config('app.admission_purge', 'off', true);
  PERFORM set_config('app.retention_run_purge', 'on', true);
  DELETE FROM public.admission_ledger_purge_runs
   WHERE cutoff_at IN (v_now - interval '365 days');
  PERFORM set_config('app.retention_run_purge', 'off', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.admission_retention_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admission_retention_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.admission_retention_selftest() FROM authenticated;

-- ----------------------------------------------------------------------------
-- Agenda diária (03:47) — fora dos horários já ocupados pelas demais rotinas.
-- ----------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-admission-ledger')
     WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-admission-ledger');
    PERFORM cron.schedule(
      'purge-admission-ledger',
      '47 3 * * *',
      $job$SELECT public.purge_admission_ledger(365, 50000, now());$job$
    );
  END IF;
END;
$cron$;