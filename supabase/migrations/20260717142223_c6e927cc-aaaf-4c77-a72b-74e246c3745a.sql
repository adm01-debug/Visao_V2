
CREATE OR REPLACE FUNCTION public.get_txid_wraparound_status(_limit int DEFAULT 20)
RETURNS TABLE (
  scope text,
  object_name text,
  xid_age bigint,
  age_ratio_pct numeric,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_max_age bigint := 200000000; -- default autovacuum_freeze_max_age
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  BEGIN
    SELECT setting::bigint INTO v_max_age
    FROM pg_settings WHERE name = 'autovacuum_freeze_max_age';
  EXCEPTION WHEN OTHERS THEN
    v_max_age := 200000000;
  END;

  RETURN QUERY
  SELECT
    'database'::text AS scope,
    d.datname::text AS object_name,
    age(d.datfrozenxid)::bigint AS xid_age,
    round((age(d.datfrozenxid)::numeric / v_max_age) * 100, 2) AS age_ratio_pct,
    CASE
      WHEN age(d.datfrozenxid) > (v_max_age * 2.5) THEN 'critical'
      WHEN age(d.datfrozenxid) > (v_max_age * 0.75) THEN 'warn'
      ELSE 'ok'
    END::text AS severity,
    CASE
      WHEN age(d.datfrozenxid) > (v_max_age * 2.5) THEN 'URGENTE: VACUUM (FREEZE) imediato no banco'
      WHEN age(d.datfrozenxid) > (v_max_age * 0.75) THEN 'Programar VACUUM (FREEZE) preventivo'
      ELSE 'ok'
    END::text AS recommendation
  FROM pg_database d
  WHERE d.datname = current_database();

  RETURN QUERY
  SELECT
    'table'::text AS scope,
    (n.nspname || '.' || c.relname)::text AS object_name,
    age(c.relfrozenxid)::bigint AS xid_age,
    round((age(c.relfrozenxid)::numeric / v_max_age) * 100, 2) AS age_ratio_pct,
    CASE
      WHEN age(c.relfrozenxid) > (v_max_age * 2.5) THEN 'critical'
      WHEN age(c.relfrozenxid) > (v_max_age * 0.75) THEN 'warn'
      ELSE 'ok'
    END::text AS severity,
    CASE
      WHEN age(c.relfrozenxid) > (v_max_age * 2.5) THEN
        format('URGENTE: VACUUM (FREEZE) %I.%I', n.nspname, c.relname)
      WHEN age(c.relfrozenxid) > (v_max_age * 0.75) THEN
        format('Programar VACUUM (FREEZE) %I.%I', n.nspname, c.relname)
      ELSE 'ok'
    END::text AS recommendation
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'm', 't')
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND c.relfrozenxid IS NOT NULL
    AND c.relfrozenxid <> 0
  ORDER BY xid_age DESC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_txid_wraparound_status(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_txid_wraparound_status(int) TO authenticated;
