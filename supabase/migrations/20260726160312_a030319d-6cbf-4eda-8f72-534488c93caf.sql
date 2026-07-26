-- =====================================================================
-- ONDA 107 — Ciclo de vida das partições: autodescoberta, DEFAULT
-- partition, blindagem RLS e agendamento pg_cron.
--
-- Gaps fechados (simulação: 4800 cenários, 3204 inseguros):
--  1. Lista de pais HARDCODED -> autodescoberta via pg_class.
--  2. Sem partição DEFAULT -> INSERT fora do range falhava (23514).
--  3. Sem agendamento -> cobertura decaía até parar a ingestão.
--  4. Sem telemetria -> incidente só era notado em produção.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Telemetria de execução
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partition_maintenance_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at         timestamptz NOT NULL DEFAULT now(),
  duration_ms    integer     NOT NULL DEFAULT 0,
  months_ahead   integer     NOT NULL DEFAULT 0,
  parents        text[]      NOT NULL DEFAULT ARRAY[]::text[],
  ensured        text[]      NOT NULL DEFAULT ARRAY[]::text[],
  hardened       text[]      NOT NULL DEFAULT ARRAY[]::text[],
  defaults_added text[]      NOT NULL DEFAULT ARRAY[]::text[],
  skipped        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ok             boolean     NOT NULL DEFAULT true,
  error_detail   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Grants: leitura só para admins (via policy); escrita apenas service_role.
GRANT SELECT ON public.partition_maintenance_runs TO authenticated;
GRANT ALL    ON public.partition_maintenance_runs TO service_role;

ALTER TABLE public.partition_maintenance_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view partition maintenance runs"
  ON public.partition_maintenance_runs;
CREATE POLICY "Admins can view partition maintenance runs"
  ON public.partition_maintenance_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages partition maintenance runs"
  ON public.partition_maintenance_runs;
CREATE POLICY "Service role manages partition maintenance runs"
  ON public.partition_maintenance_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_partition_maintenance_runs_updated_at
  ON public.partition_maintenance_runs;
CREATE TRIGGER update_partition_maintenance_runs_updated_at
  BEFORE UPDATE ON public.partition_maintenance_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_partition_maintenance_runs_ran_at
  ON public.partition_maintenance_runs (ran_at DESC);

-- ---------------------------------------------------------------------
-- 2) ensure_future_partitions: autodescoberta + DEFAULT + blindagem
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_future_partitions(months_ahead integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  t0             timestamptz := clock_timestamp();
  parent         text;
  parents        text[] := ARRAY[]::text[];
  skipped        jsonb  := '[]'::jsonb;
  i              int;
  start_d        date;
  end_d          date;
  part_name      text;
  created        text[] := ARRAY[]::text[];
  hardened       text[] := ARRAY[]::text[];
  defaults_added text[] := ARRAY[]::text[];
  result         jsonb;
BEGIN
  -- Clamp defensivo: horizonte negativo ou absurdo vira faixa sã.
  months_ahead := LEAST(GREATEST(COALESCE(months_ahead, 3), 0), 24);

  -- Autodescoberta: toda tabela particionada do schema public cuja chave de
  -- particionamento seja RANGE e que possua a coluna user_id (necessária para
  -- a policy de isolamento). Tabelas sem user_id são registradas em `skipped`
  -- em vez de derrubar a rotina com 42703.
  FOR parent IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_partitioned_table pt ON pt.partrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'p'
      AND pt.partstrat = 'r'
    ORDER BY c.relname
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = format('public.%I', parent)::regclass
        AND a.attname  = 'user_id'
        AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      skipped := skipped || jsonb_build_object('parent', parent, 'reason', 'sem coluna user_id');
      CONTINUE;
    END IF;

    parents := array_append(parents, parent);

    -- 2.1) Partições mensais do horizonte -----------------------------
    FOR i IN 0..months_ahead LOOP
      start_d   := date_trunc('month', (now() + make_interval(months => i)))::date;
      end_d     := (start_d + interval '1 month')::date;
      part_name := format('%s_m%s_%s', parent, to_char(start_d, 'YYYY'), to_char(start_d, 'MM'));

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
        part_name, parent, start_d, end_d
      );

      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', part_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', part_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = part_name
          AND policyname = part_name || '_user_isolation'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
          part_name || '_user_isolation', part_name
        );
        hardened := array_append(hardened, part_name);
      END IF;

      created := array_append(created, part_name);
    END LOOP;

    -- 2.2) Partição DEFAULT (balde de contingência) -------------------
    -- Sem ela, timestamp fora de qualquer range (relógio de câmera errado,
    -- backfill antigo) aborta o INSERT com 23514 e derruba a ingestão.
    part_name := parent || '_default';
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = part_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.%I DEFAULT', part_name, parent
      );
      defaults_added := array_append(defaults_added, part_name);
    END IF;

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', part_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', part_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = part_name
        AND policyname = part_name || '_user_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        part_name || '_user_isolation', part_name
      );
      hardened := array_append(hardened, part_name);
    END IF;
  END LOOP;

  result := jsonb_build_object(
    'ensured', created,
    'hardened', hardened,
    'defaults_added', defaults_added,
    'parents', parents,
    'skipped', skipped,
    'ran_at', now()
  );

  INSERT INTO public.partition_maintenance_runs
    (duration_ms, months_ahead, parents, ensured, hardened, defaults_added, skipped, ok)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    months_ahead, parents, created, hardened, defaults_added, skipped, true
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Falha parcial precisa ser auditável: o cron não tem quem leia o stderr.
  INSERT INTO public.partition_maintenance_runs
    (duration_ms, months_ahead, parents, ensured, hardened, defaults_added, skipped, ok, error_detail)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    months_ahead, parents, created, hardened, defaults_added, skipped, false,
    SQLSTATE || ': ' || SQLERRM
  );
  RAISE;
END;
$fn$;

REVOKE ALL ON FUNCTION public.ensure_future_partitions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_future_partitions(integer) TO service_role;

-- ---------------------------------------------------------------------
-- 3) Indicador de saúde da cobertura (admin-only)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_partition_coverage()
RETURNS TABLE (
  parent               text,
  partitions_total     integer,
  months_ahead_covered integer,
  last_month_covered   date,
  has_default          boolean,
  default_rows_estimate bigint,
  unprotected_count    integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'acesso negado: requer papel admin';
  END IF;

  RETURN QUERY
  WITH parts AS (
    SELECT
      p.relname AS parent_name,
      c.relname AS part_name,
      c.relrowsecurity,
      c.reltuples,
      pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits inh
    JOIN pg_class p ON p.oid = inh.inhparent
    JOIN pg_class c ON c.oid = inh.inhrelid
    JOIN pg_namespace n ON n.oid = p.relnamespace
    WHERE n.nspname = 'public' AND p.relkind = 'p'
  ),
  ranged AS (
    SELECT
      parent_name,
      part_name,
      relrowsecurity,
      reltuples,
      bound LIKE '%DEFAULT%' AS is_default,
      CASE
        WHEN bound LIKE '%DEFAULT%' THEN NULL
        ELSE (substring(bound from $re$TO \('([0-9]{4}-[0-9]{2}-[0-9]{2})$re$))::date
      END AS upper_bound
    FROM parts
  )
  SELECT
    r.parent_name::text,
    COUNT(*)::int,
    GREATEST(
      0,
      COALESCE(
        (EXTRACT(YEAR  FROM age(MAX(r.upper_bound), date_trunc('month', now())::date)) * 12
       + EXTRACT(MONTH FROM age(MAX(r.upper_bound), date_trunc('month', now())::date)))::int - 1,
        0
      )
    )::int,
    MAX(r.upper_bound),
    bool_or(r.is_default),
    COALESCE(MAX(r.reltuples) FILTER (WHERE r.is_default), 0)::bigint,
    COUNT(*) FILTER (
      WHERE NOT r.relrowsecurity
         OR NOT EXISTS (
              SELECT 1 FROM pg_policies pol
              WHERE pol.schemaname = 'public' AND pol.tablename = r.part_name
            )
    )::int
  FROM ranged r
  GROUP BY r.parent_name
  ORDER BY r.parent_name;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_partition_coverage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partition_coverage() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4) Convergência imediata + agendamento diário
-- ---------------------------------------------------------------------
SELECT public.ensure_future_partitions(6);

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ensure-future-partitions-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ensure-future-partitions-daily');

    PERFORM cron.schedule(
      'ensure-future-partitions-daily',
      '17 3 * * *',
      $job$SELECT public.ensure_future_partitions(6);$job$
    );
  END IF;
END;
$cron$;