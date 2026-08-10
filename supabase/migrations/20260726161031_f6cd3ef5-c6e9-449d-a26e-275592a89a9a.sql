-- ============================================================================
-- Onda 108 — Drenagem da partição DEFAULT + telemetria + alerta de backlog
-- ============================================================================

-- 1) Telemetria das execuções de drenagem -----------------------------------
CREATE TABLE IF NOT EXISTS public.partition_drain_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at          timestamptz NOT NULL DEFAULT now(),
  duration_ms     integer,
  batch_size      integer,
  max_batches     integer,
  months_back     integer,
  months_ahead    integer,
  parents         text[]  NOT NULL DEFAULT ARRAY[]::text[],
  moved_rows      integer NOT NULL DEFAULT 0,
  quarantined     integer NOT NULL DEFAULT 0,
  details         jsonb   NOT NULL DEFAULT '[]'::jsonb,
  locked_out      boolean NOT NULL DEFAULT false,
  ok              boolean NOT NULL DEFAULT true,
  error_detail    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partition_drain_runs TO authenticated;
GRANT ALL    ON public.partition_drain_runs TO service_role;

ALTER TABLE public.partition_drain_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partition_drain_runs_admin_read ON public.partition_drain_runs;
CREATE POLICY partition_drain_runs_admin_read
  ON public.partition_drain_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_partition_drain_runs_ran_at
  ON public.partition_drain_runs (ran_at DESC);

DROP TRIGGER IF EXISTS update_partition_drain_runs_updated_at ON public.partition_drain_runs;
CREATE TRIGGER update_partition_drain_runs_updated_at
  BEFORE UPDATE ON public.partition_drain_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Trava compartilhada: drenagem e criação de partições nunca concorrem ---
--    Gap #6 da simulação: lote grande concorrendo com CREATE TABLE ... PARTITION OF
--    gera contenção de ACCESS EXCLUSIVE. Chave fixa derivada do nome da rotina.
CREATE OR REPLACE FUNCTION public.partition_maintenance_lock_key()
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT hashtext('public.partition_maintenance')::bigint $$;

REVOKE ALL ON FUNCTION public.partition_maintenance_lock_key() FROM PUBLIC, anon, authenticated;

-- 3) Procedure de drenagem em lotes com commit por lote ---------------------
--    Procedure (e não function) porque o COMMIT por lote é o que evita o
--    lock prolongado e a explosão de WAL apontados no gap #5.
CREATE OR REPLACE PROCEDURE public.drain_default_partitions(
  batch_size   integer DEFAULT 1000,
  max_batches  integer DEFAULT 50,
  months_back  integer DEFAULT 24,
  months_ahead integer DEFAULT 12
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t0            timestamptz := clock_timestamp();
  parent        text;
  parents       text[] := ARRAY[]::text[];
  key_col       text;
  default_part  text;
  lower_bound   timestamptz;
  upper_bound   timestamptz;
  target_month  date;
  part_name     text;
  batch         integer;
  moved_batch   integer;
  moved_parent  integer;
  moved_total   integer := 0;
  quarantined   integer := 0;
  q_parent      integer;
  details       jsonb := '[]'::jsonb;
  got_lock      boolean;
BEGIN
  -- Clamps defensivos: parâmetros vindos do cron ou de um operador distraído
  -- não podem transformar a rotina numa transação gigante (gap #5).
  batch_size   := LEAST(GREATEST(COALESCE(batch_size, 1000), 100), 20000);
  max_batches  := LEAST(GREATEST(COALESCE(max_batches, 50), 1), 500);
  months_back  := LEAST(GREATEST(COALESCE(months_back, 24), 1), 120);
  months_ahead := LEAST(GREATEST(COALESCE(months_ahead, 12), 1), 60);

  lower_bound := date_trunc('month', now() - make_interval(months => months_back));
  upper_bound := date_trunc('month', now() + make_interval(months => months_ahead + 1));

  -- Trava de sessão (não de transação): precisa sobreviver aos COMMITs.
  SELECT pg_try_advisory_lock(public.partition_maintenance_lock_key()) INTO got_lock;
  IF NOT got_lock THEN
    INSERT INTO public.partition_drain_runs
      (duration_ms, batch_size, max_batches, months_back, months_ahead, locked_out, ok, error_detail)
    VALUES (
      (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
      batch_size, max_batches, months_back, months_ahead, true, true,
      'manutenção de partições já em andamento; execução ignorada'
    );
    RETURN;
  END IF;

  FOR parent, key_col IN
    SELECT c.relname, a.attname
    FROM pg_class c
    JOIN pg_namespace n           ON n.oid = c.relnamespace
    JOIN pg_partitioned_table pt  ON pt.partrelid = c.oid
    JOIN pg_attribute a           ON a.attrelid = c.oid AND a.attnum = pt.partattrs[0]
    WHERE n.nspname = 'public'
      AND c.relkind = 'p'
      AND pt.partstrat = 'r'
      AND pt.partnatts = 1
    ORDER BY c.relname
  LOOP
    default_part := parent || '_default';

    -- Sem DEFAULT não há o que drenar.
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = default_part
    ) THEN
      CONTINUE;
    END IF;

    parents      := array_append(parents, parent);
    moved_parent := 0;

    FOR batch IN 1..max_batches LOOP
      -- Menor mês plausível ainda represado: processa um mês por vez para
      -- garantir que a partição de destino exista antes de mover (gap #4).
      EXECUTE format(
        'SELECT date_trunc(''month'', MIN(%I))::date FROM public.%I
           WHERE %I >= %L AND %I < %L',
        key_col, default_part, key_col, lower_bound, key_col, upper_bound
      ) INTO target_month;

      EXIT WHEN target_month IS NULL;

      part_name := format('%s_m%s_%s', parent,
                          to_char(target_month, 'YYYY'), to_char(target_month, 'MM'));

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
        part_name, parent, target_month, (target_month + interval '1 month')::date
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
          'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
             USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
          part_name || '_user_isolation', part_name
        );
      END IF;

      -- DELETE ... RETURNING * → INSERT no PAI: a linha inteira viaja, então
      -- user_id e demais colunas são preservados (gap #3) e o roteamento de
      -- partição do próprio Postgres escolhe o destino.
      EXECUTE format(
        'WITH victims AS (
           SELECT ctid FROM public.%I
            WHERE %I >= %L AND %I < %L
            LIMIT %s
         ),
         moved AS (
           DELETE FROM public.%I d
            WHERE d.ctid IN (SELECT ctid FROM victims)
            RETURNING d.*
         )
         INSERT INTO public.%I SELECT * FROM moved',
        default_part,
        key_col, target_month, key_col, (target_month + interval '1 month')::date,
        batch_size,
        default_part,
        parent
      );

      GET DIAGNOSTICS moved_batch = ROW_COUNT;
      EXIT WHEN moved_batch = 0;

      moved_parent := moved_parent + moved_batch;
      moved_total  := moved_total + moved_batch;

      COMMIT;  -- lote fechado: lock liberado entre lotes (gap #5)
    END LOOP;

    -- Quarentena: timestamps implausíveis permanecem na DEFAULT e são
    -- apenas contabilizados, nunca usados para criar partições absurdas (gap #7).
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I < %L OR %I >= %L',
      default_part, key_col, lower_bound, key_col, upper_bound
    ) INTO q_parent;

    quarantined := quarantined + COALESCE(q_parent, 0);
    details := details || jsonb_build_object(
      'parent', parent,
      'key_column', key_col,
      'moved', moved_parent,
      'quarantined', COALESCE(q_parent, 0)
    );
  END LOOP;

  INSERT INTO public.partition_drain_runs
    (duration_ms, batch_size, max_batches, months_back, months_ahead,
     parents, moved_rows, quarantined, details, ok)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    batch_size, max_batches, months_back, months_ahead,
    parents, moved_total, quarantined, details, true
  );

  PERFORM pg_advisory_unlock(public.partition_maintenance_lock_key());

EXCEPTION WHEN OTHERS THEN
  PERFORM pg_advisory_unlock(public.partition_maintenance_lock_key());
  INSERT INTO public.partition_drain_runs
    (duration_ms, batch_size, max_batches, months_back, months_ahead,
     parents, moved_rows, quarantined, details, ok, error_detail)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    batch_size, max_batches, months_back, months_ahead,
    parents, moved_total, quarantined, details, false,
    SQLSTATE || ': ' || SQLERRM
  );
  RAISE;
END;
$$;

REVOKE ALL ON PROCEDURE public.drain_default_partitions(integer, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;

-- 4) ensure_future_partitions passa a respeitar a mesma trava ---------------
CREATE OR REPLACE FUNCTION public.ensure_future_partitions(months_ahead integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  months_ahead := LEAST(GREATEST(COALESCE(months_ahead, 3), 0), 24);

  -- Trava de transação compartilhada com drain_default_partitions: se a
  -- drenagem estiver rodando, sair cedo é melhor que disputar ACCESS EXCLUSIVE.
  IF NOT pg_try_advisory_xact_lock(public.partition_maintenance_lock_key()) THEN
    INSERT INTO public.partition_maintenance_runs
      (duration_ms, months_ahead, parents, ensured, hardened, defaults_added, skipped, ok, error_detail)
    VALUES (
      (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
      months_ahead, parents, created, hardened, defaults_added,
      '[{"reason":"drenagem em andamento"}]'::jsonb, true,
      'manutenção de partições já em andamento; execução ignorada'
    );
    RETURN jsonb_build_object('locked_out', true, 'ran_at', now());
  END IF;

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
  INSERT INTO public.partition_maintenance_runs
    (duration_ms, months_ahead, parents, ensured, hardened, defaults_added, skipped, ok, error_detail)
  VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
    months_ahead, parents, created, hardened, defaults_added, skipped, false,
    SQLSTATE || ': ' || SQLERRM
  );
  RAISE;
END;
$function$;

-- 5) Backlog observável: quantas linhas seguem presas em cada DEFAULT -------
CREATE OR REPLACE FUNCTION public.get_partition_default_backlog()
RETURNS TABLE (parent text, default_partition text, row_estimate bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  cnt bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  FOR rec IN
    SELECT p.relname AS parent_name, c.relname AS part_name
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p    ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'
    ORDER BY p.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', rec.part_name) INTO cnt;
    parent            := rec.parent_name;
    default_partition := rec.part_name;
    row_estimate      := cnt;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partition_default_backlog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partition_default_backlog() TO authenticated, service_role;

-- 6) Agendamento diário da drenagem (03:47, após o ensure das 03:17) --------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job WHERE jobname = 'drain-default-partitions-daily';
    PERFORM cron.schedule(
      'drain-default-partitions-daily',
      '47 3 * * *',
      $job$CALL public.drain_default_partitions(1000, 50, 24, 12);$job$
    );
  END IF;
END;
$cron$;