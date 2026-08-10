-- ============================================================================
-- Onda 109 — Triagem automática da quarentena da partição DEFAULT
--
-- A Onda 108 esvazia a DEFAULT movendo o que é drenável para partições mensais.
-- O que sobra são linhas com timestamps implausíveis (epoch 0, RTC sem bateria,
-- sentinelas de firmware). Criar partições para elas poluiria o catálogo para
-- sempre; apagá-las destruiria evidência. Esta onda dá VISIBILIDADE a esse
-- resíduo — classificando-o, nunca mutando-o.
--
-- Mitigações derivadas de scripts/simulate-wave109-scenarios.mjs (5760 cenários):
--   G1 lock contention ...... mesma advisory lock da manutenção; locked_out
--   G2 unsafe shift ......... nenhuma correção automática de timestamp
--   G3 destructive purge .... nenhum DELETE; rotina é estritamente read-only
--   G4 full scan cost ....... 1 passada agregada por partição + statement_timeout
--   G5 orphan rls ........... bucket dedicado orphan_owner
--   G6 null key blindspot ... bucket dedicado null_key (IS NULL explícito)
--   G7 window drift ......... mesma janela da drenagem; bucket drainable_pending
--   G8 invisible debt ....... telemetria em partition_quarantine_runs
--   G9 sentinel overflow .... sentinelas isolados, fora de qualquer caminho DDL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.partition_quarantine_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at             timestamptz NOT NULL DEFAULT now(),
  duration_ms        integer     NOT NULL DEFAULT 0,
  months_back        integer     NOT NULL DEFAULT 24,
  months_ahead       integer     NOT NULL DEFAULT 12,
  parents            text[]      NOT NULL DEFAULT ARRAY[]::text[],
  total_quarantined  integer     NOT NULL DEFAULT 0,
  total_drainable    integer     NOT NULL DEFAULT 0,
  buckets            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  locked_out         boolean     NOT NULL DEFAULT false,
  ok                 boolean     NOT NULL DEFAULT true,
  error_detail       text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Telemetria de manutenção: sem superfície de API para anon/authenticated.
GRANT ALL ON public.partition_quarantine_runs TO service_role;

ALTER TABLE public.partition_quarantine_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partition_quarantine_runs_admin_read ON public.partition_quarantine_runs;
CREATE POLICY partition_quarantine_runs_admin_read
  ON public.partition_quarantine_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.partition_quarantine_runs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_partition_quarantine_runs_ran_at
  ON public.partition_quarantine_runs (ran_at DESC);

DROP TRIGGER IF EXISTS trg_partition_quarantine_runs_updated_at
  ON public.partition_quarantine_runs;
CREATE TRIGGER trg_partition_quarantine_runs_updated_at
  BEFORE UPDATE ON public.partition_quarantine_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Rotina de triagem — READ ONLY sobre os dados, write apenas na telemetria.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.triage_default_quarantine(
  months_back  integer DEFAULT 24,
  months_ahead integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t0           timestamptz := clock_timestamp();
  parent       text;
  key_col      text;
  has_owner    boolean;
  default_part text;
  parents      text[] := ARRAY[]::text[];
  lower_bound  timestamptz;
  upper_bound  timestamptz;
  sentinel_at  timestamptz := make_timestamptz(3000, 1, 1, 0, 0, 0);
  epoch_edge   timestamptz := make_timestamptz(2000, 1, 1, 0, 0, 0);
  buckets      jsonb := '[]'::jsonb;
  row_counts   jsonb;
  total_q      integer := 0;
  total_d      integer := 0;
  got_lock     boolean;
BEGIN
  months_back  := LEAST(GREATEST(COALESCE(months_back, 24), 1), 120);
  months_ahead := LEAST(GREATEST(COALESCE(months_ahead, 12), 1), 60);

  lower_bound := date_trunc('month', now() - make_interval(months => months_back));
  upper_bound := date_trunc('month', now() + make_interval(months => months_ahead + 1));

  -- G4: uma triagem jamais pode virar a causa de um incidente de ingestão.
  PERFORM set_config('statement_timeout', '120s', true);

  -- G1: compartilha a trava da manutenção de partições. A triagem é a menos
  -- prioritária das três rotinas; se houver disputa, ela cede e volta amanhã.
  SELECT pg_try_advisory_xact_lock(public.partition_maintenance_lock_key()) INTO got_lock;
  IF NOT got_lock THEN
    INSERT INTO public.partition_quarantine_runs
      (duration_ms, months_back, months_ahead, locked_out, ok, error_detail)
    VALUES (
      (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
      months_back, months_ahead, true, true,
      'manutenção de partições em andamento; triagem adiada'
    );
    RETURN jsonb_build_object('locked_out', true);
  END IF;

  FOR parent, key_col IN
    SELECT c.relname, a.attname
    FROM pg_class c
    JOIN pg_namespace n          ON n.oid = c.relnamespace
    JOIN pg_partitioned_table pt ON pt.partrelid = c.oid
    JOIN pg_attribute a          ON a.attrelid = c.oid AND a.attnum = pt.partattrs[0]
    WHERE n.nspname = 'public'
      AND c.relkind = 'p'
      AND pt.partstrat = 'r'
      AND pt.partnatts = 1
    ORDER BY c.relname
  LOOP
    default_part := parent || '_default';

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = default_part
    ) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pg_attribute a
      JOIN pg_class c     ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = default_part
        AND a.attname = 'user_id' AND a.attnum > 0 AND NOT a.attisdropped
    ) INTO has_owner;

    parents := array_append(parents, parent);

    -- Uma única passada agregada (G4). Buckets mutuamente exclusivos por
    -- ordem de precedência, exceto orphan_owner que é uma dimensão cruzada.
    EXECUTE format(
      'SELECT jsonb_build_object(
         ''null_key'',        count(*) FILTER (WHERE %1$I IS NULL),
         ''pre_2000'',        count(*) FILTER (WHERE %1$I IS NOT NULL AND %1$I < %2$L),
         ''far_past'',        count(*) FILTER (WHERE %1$I >= %2$L AND %1$I < %3$L),
         ''drainable'',       count(*) FILTER (WHERE %1$I >= %3$L AND %1$I < %4$L),
         ''far_future'',      count(*) FILTER (WHERE %1$I >= %4$L AND %1$I < %5$L),
         ''sentinel'',        count(*) FILTER (WHERE %1$I >= %5$L),
         ''orphan_owner'',    %6$s,
         ''min_ts'',          min(%1$I),
         ''max_ts'',          max(%1$I),
         ''total'',           count(*)
       )
       FROM public.%7$I',
      key_col,
      epoch_edge, lower_bound, upper_bound, sentinel_at,
      CASE WHEN has_owner THEN 'count(*) FILTER (WHERE user_id IS NULL)' ELSE '0' END,
      default_part
    ) INTO row_counts;

    total_d := total_d + COALESCE((row_counts->>'drainable')::int, 0);
    total_q := total_q
             + COALESCE((row_counts->>'null_key')::int, 0)
             + COALESCE((row_counts->>'pre_2000')::int, 0)
             + COALESCE((row_counts->>'far_past')::int, 0)
             + COALESCE((row_counts->>'far_future')::int, 0)
             + COALESCE((row_counts->>'sentinel')::int, 0);

    buckets := buckets || jsonb_build_array(
      jsonb_build_object(
        'parent',       parent,
        'default_part', default_part,
        'key_column',   key_col,
        'counts',       row_counts
      )
    );
  END LOOP;

  INSERT INTO public.partition_quarantine_runs
    (duration_ms, months_back, months_ahead, parents,
     total_quarantined, total_drainable, buckets, locked_out, ok)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    months_back, months_ahead, parents,
    total_q, total_d, buckets, false, true
  );

  RETURN jsonb_build_object(
    'locked_out',        false,
    'parents',           to_jsonb(parents),
    'total_quarantined', total_q,
    'total_drainable',   total_d,
    'buckets',           buckets
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.partition_quarantine_runs
    (duration_ms, months_back, months_ahead, parents, buckets, ok, error_detail)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    months_back, months_ahead, parents, buckets, false, SQLERRM
  );
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.triage_default_quarantine(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.triage_default_quarantine(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.triage_default_quarantine(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.triage_default_quarantine(integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- Resumo em tempo real para o painel administrativo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_partition_quarantine_summary()
RETURNS TABLE (
  parent            text,
  default_part      text,
  key_column        text,
  null_key          bigint,
  pre_2000          bigint,
  far_past          bigint,
  far_future        bigint,
  sentinel          bigint,
  drainable         bigint,
  orphan_owner      bigint,
  total_quarantined bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'acesso restrito a administradores';
  END IF;

  FOR b IN
    SELECT jsonb_array_elements(r.buckets)
    FROM public.partition_quarantine_runs r
    WHERE r.ok AND NOT r.locked_out
    ORDER BY r.ran_at DESC
    LIMIT 1
  LOOP
    parent            := b->>'parent';
    default_part      := b->>'default_part';
    key_column        := b->>'key_column';
    null_key          := COALESCE((b#>>'{counts,null_key}')::bigint, 0);
    pre_2000          := COALESCE((b#>>'{counts,pre_2000}')::bigint, 0);
    far_past          := COALESCE((b#>>'{counts,far_past}')::bigint, 0);
    far_future        := COALESCE((b#>>'{counts,far_future}')::bigint, 0);
    sentinel          := COALESCE((b#>>'{counts,sentinel}')::bigint, 0);
    drainable         := COALESCE((b#>>'{counts,drainable}')::bigint, 0);
    orphan_owner      := COALESCE((b#>>'{counts,orphan_owner}')::bigint, 0);
    total_quarantined := null_key + pre_2000 + far_past + far_future + sentinel;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partition_quarantine_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_partition_quarantine_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_partition_quarantine_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partition_quarantine_summary() TO service_role;

-- ---------------------------------------------------------------------------
-- Agenda: 02:57, imediatamente ANTES da drenagem (03:07) e da criação de
-- partições (03:17). Assim o retrato é tirado com a DEFAULT ainda cheia,
-- revelando também o backlog drenável do dia.
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'triage-default-quarantine';

    PERFORM cron.schedule(
      'triage-default-quarantine',
      '57 2 * * *',
      $job$SELECT public.triage_default_quarantine(24, 12);$job$
    );
  END IF;
END;
$cron$;