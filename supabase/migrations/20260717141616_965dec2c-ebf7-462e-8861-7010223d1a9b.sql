
CREATE OR REPLACE FUNCTION public.get_temp_file_offenders(_limit int DEFAULT 20)
RETURNS TABLE (
  scope text,
  query_text text,
  calls bigint,
  temp_blks_read bigint,
  temp_blks_written bigint,
  temp_bytes_total bigint,
  avg_temp_bytes_per_call numeric,
  total_time_ms numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RETURN;
  END IF;

  RETURN QUERY
  EXECUTE format($q$
    SELECT
      'query'::text AS scope,
      left(regexp_replace(s.query, '\s+', ' ', 'g'), 400) AS query_text,
      s.calls,
      s.temp_blks_read,
      s.temp_blks_written,
      ((s.temp_blks_read + s.temp_blks_written) * 8192)::bigint AS temp_bytes_total,
      CASE WHEN s.calls > 0
        THEN round(((s.temp_blks_read + s.temp_blks_written) * 8192.0) / s.calls, 2)
        ELSE 0 END AS avg_temp_bytes_per_call,
      round(s.total_exec_time::numeric, 2) AS total_time_ms
    FROM pg_stat_statements s
    WHERE (s.temp_blks_read + s.temp_blks_written) > 0
      AND s.query NOT ILIKE %L
      AND s.query NOT ILIKE %L
      AND s.query NOT ILIKE %L
    ORDER BY (s.temp_blks_read + s.temp_blks_written) DESC
    LIMIT %s
  $q$, '%pg_stat_statements%', '%pg_stat_activity%', '%get_temp_file_offenders%', _limit);
END;
$$;

REVOKE ALL ON FUNCTION public.get_temp_file_offenders(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_temp_file_offenders(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_temp_files_summary()
RETURNS TABLE (
  datname text,
  temp_files bigint,
  temp_bytes bigint,
  stats_reset timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  SELECT d.datname::text, d.temp_files, d.temp_bytes, d.stats_reset
  FROM pg_stat_database d
  WHERE d.datname = current_database();
END;
$$;

REVOKE ALL ON FUNCTION public.get_temp_files_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_temp_files_summary() TO authenticated;
