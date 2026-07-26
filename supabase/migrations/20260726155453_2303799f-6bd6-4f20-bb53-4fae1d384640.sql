CREATE OR REPLACE FUNCTION public.ensure_future_partitions(months_ahead integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  parent text;
  i int;
  start_d date;
  end_d date;
  part_name text;
  created text[] := ARRAY[]::text[];
  hardened text[] := ARRAY[]::text[];
  parents text[] := ARRAY['recognition_logs','plate_detections'];
BEGIN
  FOREACH parent IN ARRAY parents LOOP
    FOR i IN 0..months_ahead LOOP
      start_d := date_trunc('month', (now() + make_interval(months => i)))::date;
      end_d := (start_d + interval '1 month')::date;
      part_name := format('%s_m%s_%s', parent,
                          to_char(start_d,'YYYY'),
                          to_char(start_d,'MM'));

      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
        part_name, parent, start_d, end_d
      );

      -- Grants (mantidos da versão anterior). anon NUNCA recebe grant aqui.
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', part_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', part_name);

      -- Onda 106: RLS na própria partição. A policy do pai só vale quando a
      -- query passa pela tabela particionada; SELECT direto na partição usa a
      -- RLS da partição. Sem isto, toda partição nova ficaria legível entre tenants.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', part_name);

      -- CREATE POLICY não é idempotente (42710) → checagem prévia.
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = part_name
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
  END LOOP;

  RETURN jsonb_build_object('ensured', created, 'hardened', hardened, 'ran_at', now());
END;
$fn$;

REVOKE ALL ON FUNCTION public.ensure_future_partitions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_future_partitions(integer) TO service_role;

-- Reconvergência imediata: próximos 6 meses + partições já existentes do mês corrente.
SELECT public.ensure_future_partitions(6);

-- Backfill defensivo: qualquer partição existente sem RLS ou sem policy é blindada agora.
DO $backfill$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS part
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relispartition
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.part);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = r.part
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        r.part || '_user_isolation', r.part
      );
    END IF;
  END LOOP;
END;
$backfill$;