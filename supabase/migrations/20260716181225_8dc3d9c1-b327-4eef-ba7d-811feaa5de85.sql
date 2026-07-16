
CREATE OR REPLACE FUNCTION public.ensure_future_partitions(months_ahead int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent text;
  i int;
  start_d date;
  end_d date;
  part_name text;
  created text[] := ARRAY[]::text[];
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
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', part_name);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', part_name);
      created := array_append(created, part_name);
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('ensured', created, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_future_partitions(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_future_partitions(int) TO service_role;

-- Execução imediata para garantir 3 meses à frente
SELECT public.ensure_future_partitions(3);
