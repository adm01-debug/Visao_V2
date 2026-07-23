
CREATE OR REPLACE FUNCTION public.cron_watchdog_consecutive_problems(_min_runs integer DEFAULT 3)
RETURNS TABLE (
  consecutive_problem_runs integer,
  last_run_at timestamptz,
  total_problems integer,
  distinct_jobs integer,
  jobnames text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_last timestamptz;
  v_total integer := 0;
  v_jobs text[] := ARRAY[]::text[];
  r record;
BEGIN
  FOR r IN
    SELECT ran_at, problems, details
    FROM public.cron_watchdog_runs
    ORDER BY ran_at DESC
    LIMIT GREATEST(_min_runs * 2, 10)
  LOOP
    IF v_last IS NULL THEN v_last := r.ran_at; END IF;
    IF r.problems > 0 THEN
      v_count := v_count + 1;
      v_total := v_total + r.problems;
      SELECT array_agg(DISTINCT jn) INTO v_jobs
      FROM (
        SELECT unnest(v_jobs) AS jn
        UNION
        SELECT (d->>'jobname') FROM jsonb_array_elements(COALESCE(r.details, '[]'::jsonb)) d
      ) x
      WHERE jn IS NOT NULL;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    v_count,
    v_last,
    v_total,
    COALESCE(array_length(v_jobs, 1), 0),
    COALESCE(v_jobs, ARRAY[]::text[]);
END;
$$;

REVOKE ALL ON FUNCTION public.cron_watchdog_consecutive_problems(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cron_watchdog_consecutive_problems(integer) TO authenticated, service_role;
