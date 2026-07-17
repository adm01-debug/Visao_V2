CREATE OR REPLACE FUNCTION public.get_sequence_exhaustion()
RETURNS TABLE (
  schema_name text,
  sequence_name text,
  data_type text,
  last_value bigint,
  max_value bigint,
  increment_by bigint,
  is_cycled boolean,
  owned_by_table text,
  owned_by_column text,
  pct_used numeric,
  severity text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'permission denied: admin role required';
  END IF;

  RETURN QUERY
  WITH seqs AS (
    SELECT
      n.nspname::text AS schema_name,
      c.relname::text AS sequence_name,
      s.seqtypid::regtype::text AS data_type,
      s.seqmax AS max_value,
      s.seqincrement AS increment_by,
      s.seqcycle AS is_cycled,
      dep_t.relname::text AS owned_by_table,
      a.attname::text AS owned_by_column,
      c.oid AS seq_oid,
      n.nspname AS ns
    FROM pg_sequence s
    JOIN pg_class c ON c.oid = s.seqrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_depend d
      ON d.objid = c.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'a'
    LEFT JOIN pg_class dep_t ON dep_t.oid = d.refobjid
    LEFT JOIN pg_attribute a
      ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  )
  SELECT
    q.schema_name,
    q.sequence_name,
    q.data_type,
    lv.last_value,
    q.max_value,
    q.increment_by,
    q.is_cycled,
    q.owned_by_table,
    q.owned_by_column,
    CASE
      WHEN q.max_value <= 0 THEN 0::numeric
      ELSE ROUND((COALESCE(lv.last_value, 0)::numeric / q.max_value::numeric) * 100, 4)
    END AS pct_used,
    CASE
      WHEN q.is_cycled THEN 'ok'
      WHEN lv.last_value IS NULL THEN 'ok'
      WHEN (lv.last_value::numeric / NULLIF(q.max_value, 0)::numeric) >= 0.90 THEN 'critical'
      WHEN (lv.last_value::numeric / NULLIF(q.max_value, 0)::numeric) >= 0.75 THEN 'high'
      WHEN (lv.last_value::numeric / NULLIF(q.max_value, 0)::numeric) >= 0.50 THEN 'medium'
      ELSE 'ok'
    END AS severity
  FROM seqs q
  LEFT JOIN LATERAL (
    SELECT (pg_sequence_last_value(format('%I.%I', q.ns, q.sequence_name)::regclass))::bigint AS last_value
  ) lv ON TRUE
  ORDER BY pct_used DESC NULLS LAST, q.schema_name, q.sequence_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sequence_exhaustion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sequence_exhaustion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sequence_exhaustion() TO service_role;

COMMENT ON FUNCTION public.get_sequence_exhaustion() IS
  'Onda 89: retorna uso corrente de cada sequence e severidade (ok/medium/high/critical). Sequences cíclicas são sempre ok. Requer role admin.';