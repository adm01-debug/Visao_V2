-- ============================================================================
-- Onda 184 — retenção auditada dos episódios de reincidência de alarme.
--
-- Contexto: `alarm_recurrence_episodes` (Onda 180) é append-only por gatilho e
-- cresce indefinidamente. Toda tabela de dado operacional precisa de prazo de
-- guarda declarado E de supervisão — o registro da Onda 134 só enxerga rotinas
-- que possuam tabela `%_purge_runs`, então a auditoria vem junto.
--
-- Invariantes desta onda:
--   1. Episódio ABERTO nunca é apagado, por mais velho que seja. Apagá-lo
--      destruiria o denominador de uma reincidência ainda em curso. Abertos
--      antigos viram FATO contado (`abandoned_open`), não lixo removido.
--   2. O prazo conta pelo FECHAMENTO, não pela abertura: um episódio longo que
--      encerrou ontem é recente, ainda que tenha aberto há um ano.
--   3. O expurgo é a ÚNICA exceção ao append-only, e é nominal: o gatilho só
--      aceita DELETE quando a rotina se identifica pela variável de sessão.
--   4. Teto por execução com resto declarado (`truncated` + `pending`), para
--      que uma limpeza parcial nunca seja lida como limpeza concluída.
-- ============================================================================

-- --- Política (fonte da verdade espelhada em TypeScript) ---------------------
CREATE OR REPLACE FUNCTION public.alarm_recurrence_retention_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'closedRetentionDays', 365,
    'abandonedOpenDays', 30,
    'maxDeletePerRun', 5000
  )
$$;

REVOKE ALL ON FUNCTION public.alarm_recurrence_retention_policy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alarm_recurrence_retention_policy() TO authenticated, service_role;

-- --- Auditoria das execuções -------------------------------------------------
CREATE TABLE public.alarm_recurrence_purge_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at       timestamptz NOT NULL DEFAULT now(),
  deleted_episodes  integer NOT NULL DEFAULT 0 CHECK (deleted_episodes >= 0),
  pending_episodes  integer NOT NULL DEFAULT 0 CHECK (pending_episodes >= 0),
  abandoned_open    integer NOT NULL DEFAULT 0 CHECK (abandoned_open >= 0),
  truncated         boolean NOT NULL DEFAULT false,
  policy            jsonb   NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alarm_recurrence_purge_runs_executed_at
  ON public.alarm_recurrence_purge_runs (executed_at DESC);

-- Default privileges do papel `postgres` concedem tudo a anon: revogar sempre.
REVOKE ALL ON TABLE public.alarm_recurrence_purge_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.alarm_recurrence_purge_runs FROM anon;
REVOKE ALL ON TABLE public.alarm_recurrence_purge_runs FROM authenticated;
GRANT SELECT ON TABLE public.alarm_recurrence_purge_runs TO authenticated;
GRANT ALL    ON TABLE public.alarm_recurrence_purge_runs TO service_role;

ALTER TABLE public.alarm_recurrence_purge_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY alarm_recurrence_purge_runs_admin_select
  ON public.alarm_recurrence_purge_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- A trilha de expurgo é prova de cumprimento de prazo: não se reescreve.
CREATE OR REPLACE FUNCTION public.block_retention_run_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION '% é imutável (append-only)', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER trg_alarm_recurrence_purge_runs_immutable
  BEFORE UPDATE OR DELETE ON public.alarm_recurrence_purge_runs
  FOR EACH ROW EXECUTE FUNCTION public.block_retention_run_mutation();

-- --- Exceção nominal ao append-only dos episódios ----------------------------
CREATE OR REPLACE FUNCTION public.block_alarm_recurrence_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Única exceção: a rotina de retenção, que se identifica nominalmente.
    -- Qualquer outro caminho continua recusado, inclusive service_role.
    IF current_setting('app.retention_purge', true) IS DISTINCT FROM 'alarm_recurrence_episodes' THEN
      RAISE EXCEPTION 'alarm_recurrence_episodes é imutável (append-only)';
    END IF;
    IF OLD.closed_at IS NULL THEN
      RAISE EXCEPTION 'episódio aberto nunca é expurgado' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'episódio já encerrado não pode ser alterado';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.series_key IS DISTINCT FROM OLD.series_key
     OR NEW.opened_at IS DISTINCT FROM OLD.opened_at
     OR NEW.severity IS DISTINCT FROM OLD.severity THEN
    RAISE EXCEPTION 'somente o encerramento do episódio pode ser gravado';
  END IF;
  IF NEW.closed_at IS NULL THEN
    RAISE EXCEPTION 'atualização precisa encerrar o episódio';
  END IF;
  IF NEW.closed_at < OLD.opened_at THEN
    RAISE EXCEPTION 'encerramento antes da abertura' USING ERRCODE = 'check_violation';
  END IF;
  NEW.duration_ms := (EXTRACT(EPOCH FROM (NEW.closed_at - OLD.opened_at)) * 1000)::bigint;
  RETURN NEW;
END;
$$;

-- --- A rotina ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_alarm_recurrence_episodes(
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_policy    jsonb    := public.alarm_recurrence_retention_policy();
  v_limit     int      := (v_policy ->> 'maxDeletePerRun')::int;
  v_keep      interval := ((v_policy ->> 'closedRetentionDays')::int || ' days')::interval;
  v_abandon   interval := ((v_policy ->> 'abandonedOpenDays')::int || ' days')::interval;
  v_cutoff    timestamptz := p_now - v_keep;
  v_deleted   int := 0;
  v_pending   int := 0;
  v_abandoned int := 0;
BEGIN
  PERFORM set_config('app.retention_purge', 'alarm_recurrence_episodes', true);

  WITH victims AS (
    SELECT id
      FROM public.alarm_recurrence_episodes
     WHERE closed_at IS NOT NULL      -- invariante 1
       AND closed_at < v_cutoff       -- invariante 2
     ORDER BY closed_at
     LIMIT v_limit
  ), gone AS (
    DELETE FROM public.alarm_recurrence_episodes e
     USING victims v
     WHERE e.id = v.id
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM gone;

  -- Resto declarado: o que sobrou elegível depois desta execução.
  SELECT count(*) INTO v_pending
    FROM public.alarm_recurrence_episodes
   WHERE closed_at IS NOT NULL AND closed_at < v_cutoff;

  -- Aberto antigo é fato reportado, nunca linha removida.
  SELECT count(*) INTO v_abandoned
    FROM public.alarm_recurrence_episodes
   WHERE closed_at IS NULL AND opened_at < p_now - v_abandon;

  PERFORM set_config('app.retention_purge', '', true);

  INSERT INTO public.alarm_recurrence_purge_runs
    (executed_at, deleted_episodes, pending_episodes, abandoned_open, truncated, policy)
  VALUES (p_now, v_deleted, v_pending, v_abandoned, v_pending > 0, v_policy);

  RETURN jsonb_build_object(
    'deletedEpisodes', v_deleted,
    'pendingEpisodes', v_pending,
    'abandonedOpen',   v_abandoned,
    'truncated',       v_pending > 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_alarm_recurrence_episodes(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_alarm_recurrence_episodes(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.purge_alarm_recurrence_episodes(timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_alarm_recurrence_episodes(timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.block_retention_run_mutation() FROM PUBLIC;

-- --- Registro de supervisão (Onda 134) ---------------------------------------
CREATE OR REPLACE FUNCTION public.retention_routine_registry()
RETURNS TABLE (job_name text, source_table text, cadence_minutes int, label text)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  VALUES
    ('agent_discoveries',  'agent_discoveries_purge_runs',      1440, 'Descobertas de agentes locais'),
    ('agent_relay_tasks',  'agent_relay_purge_runs',            1440, 'Tarefas de relay dos agentes'),
    ('alarm_recurrence',   'alarm_recurrence_purge_runs',       1440, 'Episódios de reincidência de alarme'),
    ('collab_entries',     'collab_entry_purge_runs',           1440, 'Entradas da rede colaborativa'),
    ('collab_notifications','collab_notification_purge_runs',     60, 'Avisos da rede colaborativa')
$$;

SELECT cron.schedule(
  'purge-alarm-recurrence-episodes',
  '51 3 * * *',
  $cron$SELECT public.purge_alarm_recurrence_episodes();$cron$
);