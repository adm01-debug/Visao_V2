-- ============================================================================
-- Onda 108.1 — Ordem correta: esvaziar a DEFAULT ANTES de criar a partição
-- ----------------------------------------------------------------------------
-- Descoberta na validação: `CREATE TABLE ... PARTITION OF` aborta com
-- "updated partition constraint for default partition would be violated by
-- some row" enquanto a DEFAULT contiver linhas do range novo. A drenagem
-- precisa, portanto, mover as linhas para uma área de staging temporária,
-- criar a partição e só então reinserir no pai.
-- ============================================================================

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
  batch_size   := LEAST(GREATEST(COALESCE(batch_size, 1000), 100), 20000);
  max_batches  := LEAST(GREATEST(COALESCE(max_batches, 50), 1), 500);
  months_back  := LEAST(GREATEST(COALESCE(months_back, 24), 1), 120);
  months_ahead := LEAST(GREATEST(COALESCE(months_ahead, 12), 1), 60);

  lower_bound := date_trunc('month', now() - make_interval(months => months_back));
  upper_bound := date_trunc('month', now() + make_interval(months => months_ahead + 1));

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
      EXECUTE format(
        'SELECT date_trunc(''month'', MIN(%I))::date FROM public.%I
           WHERE %I >= %L AND %I < %L',
        key_col, default_part, key_col, lower_bound, key_col, upper_bound
      ) INTO target_month;

      EXIT WHEN target_month IS NULL;

      part_name := format('%s_m%s_%s', parent,
                          to_char(target_month, 'YYYY'), to_char(target_month, 'MM'));

      -- (a) Staging temporário, descartado no fim da transação do lote.
      EXECUTE format(
        'CREATE TEMP TABLE _drain_stage ON COMMIT DROP AS
           SELECT * FROM public.%I WHERE false', default_part
      );

      -- (b) Retira o lote da DEFAULT preservando a linha inteira (user_id incluso).
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
         INSERT INTO _drain_stage SELECT * FROM moved',
        default_part,
        key_col, target_month, key_col, (target_month + interval '1 month')::date,
        batch_size,
        default_part
      );

      GET DIAGNOSTICS moved_batch = ROW_COUNT;

      IF moved_batch = 0 THEN
        EXECUTE 'DROP TABLE IF EXISTS _drain_stage';
        EXIT;
      END IF;

      -- (c) Só agora a partição pode ser criada: a DEFAULT já não tem
      --     nenhuma linha que violaria a nova constraint de partição.
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

      -- (d) Reinsere no pai: o roteamento nativo escolhe a partição correta.
      EXECUTE format('INSERT INTO public.%I SELECT * FROM _drain_stage', parent);

      moved_parent := moved_parent + moved_batch;
      moved_total  := moved_total + moved_batch;

      COMMIT;  -- fecha o lote e descarta o staging (ON COMMIT DROP)
    END LOOP;

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

-- Drenagem ANTES da criação de partições (03:07 < 03:17).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job WHERE jobname = 'drain-default-partitions-daily';
    PERFORM cron.schedule(
      'drain-default-partitions-daily',
      '7 3 * * *',
      $job$CALL public.drain_default_partitions(1000, 50, 24, 12);$job$
    );
  END IF;
END;
$cron$;