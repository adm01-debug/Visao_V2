-- ============================================================================
-- Onda 237 — Guarda de retenção do histórico de conciliações (espelho de
-- src/lib/alarms/reconcileSnapshotRetention.ts, leis N1–N8).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admission_reconcile_purge_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at       timestamptz NOT NULL DEFAULT now(),
  cutoff_at         timestamptz NOT NULL,
  retention_days    integer     NOT NULL,
  batch_cap         integer     NOT NULL,
  anchor_keep       integer     NOT NULL,
  deleted_count     bigint      NOT NULL DEFAULT 0,
  deferred_count    bigint      NOT NULL DEFAULT 0,
  anchored_count    bigint      NOT NULL DEFAULT 0,
  quarantined_count bigint      NOT NULL DEFAULT 0,
  capped            boolean     NOT NULL DEFAULT false,
  duration_ms       integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- N2: faixa do prazo é lei de tabela, não convenção de chamador.
  CONSTRAINT reconcile_purge_days_range  CHECK (retention_days BETWEEN 90 AND 3650),
  CONSTRAINT reconcile_purge_cap_range   CHECK (batch_cap BETWEEN 1 AND 100000),
  CONSTRAINT reconcile_purge_anchor_range CHECK (anchor_keep BETWEEN 1 AND 1000),
  CONSTRAINT reconcile_purge_nonnegative CHECK (
    deleted_count >= 0 AND deferred_count >= 0 AND anchored_count >= 0
    AND quarantined_count >= 0 AND duration_ms >= 0
  ),
  -- N6: `capped` é derivado, nunca opinião de quem escreve.
  CONSTRAINT reconcile_purge_capped_mirror CHECK (capped = (deferred_count > 0)),
  CONSTRAINT reconcile_purge_cap_respected CHECK (deleted_count <= batch_cap)
);

CREATE INDEX IF NOT EXISTS idx_reconcile_purge_runs_executed_at
  ON public.admission_reconcile_purge_runs (executed_at DESC);

-- Default privileges do papel `postgres` concedem tudo a anon: revogar sempre.
REVOKE ALL ON public.admission_reconcile_purge_runs FROM anon;
REVOKE ALL ON public.admission_reconcile_purge_runs FROM authenticated;
GRANT SELECT ON public.admission_reconcile_purge_runs TO authenticated;
GRANT ALL    ON public.admission_reconcile_purge_runs TO service_role;

ALTER TABLE public.admission_reconcile_purge_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_reconcile_purge_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconcile_purge_runs_admin_select" ON public.admission_reconcile_purge_runs;
CREATE POLICY "reconcile_purge_runs_admin_select"
  ON public.admission_reconcile_purge_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trilha imutável: reaproveita o bloqueio já usado pelas demais rotinas.
DROP TRIGGER IF EXISTS reconcile_purge_runs_immutable ON public.admission_reconcile_purge_runs;
CREATE TRIGGER reconcile_purge_runs_immutable
  BEFORE UPDATE OR DELETE ON public.admission_reconcile_purge_runs
  FOR EACH ROW EXECUTE FUNCTION public.block_retention_run_mutation();

-- ----------------------------------------------------------------------------
-- Rotina de expurgo — espelho fiel de planSnapshotPurge()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_admission_reconcile_snapshots(
  p_retention_days integer     DEFAULT 730,
  p_batch_cap      integer     DEFAULT 10000,
  p_anchor_keep    integer     DEFAULT 7,
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
  v_expired     bigint := 0;
  v_anchored    bigint := 0;
  v_quarantined bigint := 0;
  v_deferred    bigint := 0;
BEGIN
  -- N1/N2/N6: parâmetro inválido recusa o expurgo inteiro, sem apagar nada.
  IF p_now IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_now');
  END IF;
  IF p_retention_days IS NULL OR p_retention_days < 90 OR p_retention_days > 3650 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_retention_days');
  END IF;
  IF p_batch_cap IS NULL OR p_batch_cap < 1 OR p_batch_cap > 100000 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_batch_cap');
  END IF;
  IF p_anchor_keep IS NULL OR p_anchor_keep < 1 OR p_anchor_keep > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_anchor_keep');
  END IF;

  v_cutoff := p_now - make_interval(days => p_retention_days);

  -- N5: o CHECK da tabela já barra veredito fora do catálogo; sobra o instante
  -- ilegível, impossível em `timestamptz NOT NULL`. Contamos por completude.
  SELECT count(*) INTO v_quarantined
    FROM public.admission_reconcile_snapshots
   WHERE observed_at IS NULL;

  -- N4: âncora — as `p_anchor_keep` fotos mais recentes são intocáveis.
  CREATE TEMP TABLE IF NOT EXISTS _anchor_ids (id bigint PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _anchor_ids;
  INSERT INTO _anchor_ids (id)
  SELECT id FROM public.admission_reconcile_snapshots
   WHERE observed_at IS NOT NULL
   ORDER BY observed_at DESC, id DESC
   LIMIT p_anchor_keep;

  SELECT count(*) INTO v_anchored
    FROM public.admission_reconcile_snapshots s
    JOIN _anchor_ids a ON a.id = s.id
   WHERE s.observed_at < v_cutoff;

  -- N3: empate no corte preserva (`observed_at >= cutoff` fica).
  SELECT count(*) INTO v_expired
    FROM public.admission_reconcile_snapshots s
   WHERE s.observed_at < v_cutoff
     AND NOT EXISTS (SELECT 1 FROM _anchor_ids a WHERE a.id = s.id);

  ALTER TABLE public.admission_reconcile_snapshots
    DISABLE TRIGGER trg_block_reconcile_snapshot_mutation;
  BEGIN
    WITH doomed AS (
      SELECT s.id
        FROM public.admission_reconcile_snapshots s
       WHERE s.observed_at < v_cutoff
         AND NOT EXISTS (SELECT 1 FROM _anchor_ids a WHERE a.id = s.id)
       ORDER BY s.observed_at ASC, s.id ASC
       LIMIT p_batch_cap
    ), del AS (
      DELETE FROM public.admission_reconcile_snapshots t
       USING doomed d
       WHERE t.id = d.id
      RETURNING 1
    )
    SELECT count(*) INTO v_deleted FROM del;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.admission_reconcile_snapshots
      ENABLE TRIGGER trg_block_reconcile_snapshot_mutation;
    RAISE;
  END;
  ALTER TABLE public.admission_reconcile_snapshots
    ENABLE TRIGGER trg_block_reconcile_snapshot_mutation;

  v_deferred := GREATEST(0, v_expired - v_deleted);

  -- N7/N8: toda execução é registrada, inclusive a que não apagou nada.
  INSERT INTO public.admission_reconcile_purge_runs
    (cutoff_at, retention_days, batch_cap, anchor_keep, deleted_count,
     deferred_count, anchored_count, quarantined_count, capped, duration_ms)
  VALUES
    (v_cutoff, p_retention_days, p_batch_cap, p_anchor_keep, v_deleted,
     v_deferred, v_anchored, v_quarantined, v_deferred > 0,
     GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int));

  RETURN jsonb_build_object(
    'ok', true,
    'cutoff_at', v_cutoff,
    'retention_days', p_retention_days,
    'batch_cap', p_batch_cap,
    'anchor_keep', p_anchor_keep,
    'deleted', v_deleted,
    'deferred', v_deferred,
    'anchored', v_anchored,
    'quarantined', v_quarantined,
    'capped', v_deferred > 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.purge_admission_reconcile_snapshots(integer, integer, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_admission_reconcile_snapshots(integer, integer, integer, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.purge_admission_reconcile_snapshots(integer, integer, integer, timestamptz) FROM authenticated;

-- ----------------------------------------------------------------------------
-- Registro de retenção: a nova rotina passa a ser vigiada pelo painel/fan-in
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retention_routine_registry()
RETURNS TABLE(job_name text, source_table text, cadence_minutes integer, label text)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  VALUES
    ('admission_ledger',    'admission_ledger_purge_runs',       1440, 'Janelas do livro de admissão'),
    ('admission_reconcile', 'admission_reconcile_purge_runs',    1440, 'Fotos de conciliação da admissão'),
    ('agent_discoveries',   'agent_discoveries_purge_runs',      1440, 'Descobertas de agentes locais'),
    ('agent_relay_tasks',   'agent_relay_purge_runs',            1440, 'Tarefas de relay dos agentes'),
    ('alarm_recurrence',    'alarm_recurrence_purge_runs',       1440, 'Episódios de reincidência de alarme'),
    ('collab_entries',      'collab_entry_purge_runs',           1440, 'Entradas da rede colaborativa'),
    ('collab_notifications','collab_notification_purge_runs',      60, 'Avisos da rede colaborativa')
$function$;

REVOKE ALL ON FUNCTION public.retention_routine_registry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retention_routine_registry() TO authenticated;

-- ----------------------------------------------------------------------------
-- Autoteste dinâmico: gate estático não prova execução (lição da Onda 141)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_retention_selftest()
RETURNS TABLE(check_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Relógio no futuro distante: as linhas do autoteste não colidem com dados
  -- reais e são removidas ao final por este mesmo procedimento.
  v_base timestamptz := timestamptz '2099-01-01 00:00:00+00';
  v_now  timestamptz := timestamptz '2099-01-01 00:00:00+00' + interval '2000 days';
  v_res  jsonb;
  v_left bigint;
  i      int;
BEGIN
  -- Semeadura: 12 fotos, uma por dia a partir de v_base (todas vencidas em 730d),
  -- mais uma exatamente no corte e uma recente.
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

  -- N6: teto de lote apaga a mais antiga primeiro e declara o adiamento.
  v_res := public.purge_admission_reconcile_snapshots(730, 1, 2, v_now);
  RETURN QUERY SELECT 'teto_lote_apaga_um',
    (v_res->>'deleted')::bigint = 1 AND (v_res->>'capped')::boolean IS TRUE, v_res::text;
  RETURN QUERY SELECT 'teto_lote_mais_antiga_sai',
    NOT EXISTS (SELECT 1 FROM public.admission_reconcile_snapshots
                 WHERE observed_at = v_base + interval '1 day'),
    'a foto mais antiga deveria ter saído primeiro';

  -- N4: com âncora de 2, sobram exatamente as 2 mais recentes das vencidas
  -- (a recente e a do corte não são apagáveis de todo modo).
  v_res := public.purge_admission_reconcile_snapshots(730, 1000, 2, v_now);
  RETURN QUERY SELECT 'segunda_rodada_limpa',
    (v_res->>'capped')::boolean IS FALSE, v_res::text;
  RETURN QUERY SELECT 'ancora_declarada',
    (v_res->>'anchored')::bigint >= 1, v_res::text;
  SELECT count(*) INTO v_left FROM public.admission_reconcile_snapshots
   WHERE observed_at >= v_base;
  RETURN QUERY SELECT 'ancora_preservou',
    v_left = 4, format('esperava 4 sobreviventes (2 âncoras + corte + recente), veio %s', v_left);

  -- N3: empate no corte preserva.
  RETURN QUERY SELECT 'fronteira_preservada',
    EXISTS (SELECT 1 FROM public.admission_reconcile_snapshots
             WHERE observed_at = v_now - interval '730 days'),
    'empate no corte deve preservar';
  RETURN QUERY SELECT 'recente_preservada',
    EXISTS (SELECT 1 FROM public.admission_reconcile_snapshots
             WHERE observed_at = v_now - interval '1 day'),
    'foto recente deve preservar';

  -- Idempotência.
  v_res := public.purge_admission_reconcile_snapshots(730, 1000, 2, v_now);
  RETURN QUERY SELECT 'idempotente', (v_res->>'deleted')::bigint = 0, v_res::text;

  -- Append-only continua valendo depois do expurgo (trigger reabilitado).
  BEGIN
    DELETE FROM public.admission_reconcile_snapshots WHERE observed_at >= v_base;
    RETURN QUERY SELECT 'append_only_mantido', false, 'DELETE direto passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'append_only_mantido', true, SQLERRM;
  END;

  RETURN QUERY SELECT 'trilha_registrada',
    (SELECT count(*) FROM public.admission_reconcile_purge_runs
      WHERE cutoff_at = v_now - interval '730 days') >= 3,
    'esperava >= 3 execuções registradas';

  BEGIN
    UPDATE public.admission_reconcile_purge_runs SET deleted_count = 0
     WHERE cutoff_at = v_now - interval '730 days';
    RETURN QUERY SELECT 'trilha_imutavel', false, 'UPDATE na trilha passou';
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trilha_imutavel', true, SQLERRM;
  END;

  -- Limpeza: o autoteste não pode deixar resíduo.
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

-- ----------------------------------------------------------------------------
-- Agendamento diário — 03h43, antes do snapshot (03h51) do dia seguinte.
-- ----------------------------------------------------------------------------
DO $do$
BEGIN
  PERFORM cron.unschedule('purge-admission-reconcile-snapshots');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$do$;

SELECT cron.schedule(
  'purge-admission-reconcile-snapshots',
  '43 3 * * *',
  $cron$SELECT public.purge_admission_reconcile_snapshots(730, 10000, 7, now());$cron$
);