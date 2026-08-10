-- ---------------------------------------------------------------------------
-- Onda 113 — Série temporal do backlog das partições DEFAULT
-- ---------------------------------------------------------------------------
CREATE TABLE public.partition_backlog_samples (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_table       text        NOT NULL,
  default_partition  text        NOT NULL,
  row_count          bigint      NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  sampled_at         timestamptz NOT NULL DEFAULT now(),
  duration_ms        integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.partition_backlog_samples FROM anon, PUBLIC;
GRANT SELECT ON public.partition_backlog_samples TO authenticated;
GRANT ALL    ON public.partition_backlog_samples TO service_role;

ALTER TABLE public.partition_backlog_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partition_backlog_samples_admin_read"
  ON public.partition_backlog_samples
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_partition_backlog_samples_parent_time
  ON public.partition_backlog_samples (parent_table, sampled_at DESC);

CREATE TRIGGER update_partition_backlog_samples_updated_at
  BEFORE UPDATE ON public.partition_backlog_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.partition_backlog_samples IS
  'Onda 113: série temporal da contagem de linhas nas partições DEFAULT. A classificação de severidade e a projeção de saturação vivem em src/lib/partitionBacklogTrend.ts (fonte única de verdade); esta tabela guarda apenas o dado bruto.';

-- ---------------------------------------------------------------------------
-- Coletor: descobre dinamicamente toda partição DEFAULT e mede seu tamanho.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sample_partition_backlog(retention_days integer DEFAULT 30)
RETURNS TABLE (parent_table text, default_partition text, row_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rec        record;
  cnt        bigint;
  started_at timestamptz;
BEGIN
  -- Blindagem: rotina de manutenção só é invocável manualmente por admin.
  -- O agendador (pg_cron) roda como superusuário, para o qual auth.uid() é NULL.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'acesso negado: apenas administradores podem amostrar o backlog de partições';
  END IF;

  PERFORM set_config('statement_timeout', '60000', true);

  FOR rec IN
    SELECT c.relname::text                AS part_name,
           i.inhparent::regclass::text    AS parent_name
      FROM pg_class c
      JOIN pg_inherits i ON i.inhrelid = c.oid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'
     ORDER BY 2, 1
  LOOP
    started_at := clock_timestamp();
    EXECUTE format('SELECT count(*) FROM public.%I', rec.part_name) INTO cnt;

    INSERT INTO public.partition_backlog_samples (
      parent_table, default_partition, row_count, duration_ms
    ) VALUES (
      rec.parent_name, rec.part_name, cnt,
      GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - started_at)) * 1000)::integer)
    );

    parent_table      := rec.parent_name;
    default_partition := rec.part_name;
    row_count         := cnt;
    RETURN NEXT;
  END LOOP;

  -- Retenção: a janela de análise é de dias, não de meses.
  DELETE FROM public.partition_backlog_samples
   WHERE sampled_at < now() - make_interval(days => GREATEST(1, retention_days));
END;
$$;

REVOKE ALL     ON FUNCTION public.sample_partition_backlog(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.sample_partition_backlog(integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.sample_partition_backlog(integer) IS
  'Onda 113: mede as partições DEFAULT e grava uma amostra por execução. Agendada a cada 30 min via pg_cron (partition-backlog-sampler).';

-- ---------------------------------------------------------------------------
-- Agendamento: a cada 30 minutos, deslocado dos horários de drenagem/triagem
-- para não competir pela trava advisory de manutenção.
-- ---------------------------------------------------------------------------
SELECT cron.unschedule('partition-backlog-sampler')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'partition-backlog-sampler');

SELECT cron.schedule(
  'partition-backlog-sampler',
  '13,43 * * * *',
  $cron$ SELECT public.sample_partition_backlog(30); $cron$
);

-- Semeadura imediata para que a UI e o gate tenham dado desde o primeiro minuto.
SELECT public.sample_partition_backlog(30);