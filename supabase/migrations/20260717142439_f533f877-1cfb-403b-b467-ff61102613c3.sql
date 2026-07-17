CREATE OR REPLACE FUNCTION public.get_replication_slot_status()
RETURNS TABLE(
  slot_name text,
  slot_type text,
  database text,
  plugin text,
  active boolean,
  active_pid integer,
  restart_lsn text,
  confirmed_flush_lsn text,
  retained_wal_bytes bigint,
  retained_wal_pretty text,
  severity text,
  recommendation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    s.slot_name::text,
    s.slot_type::text,
    COALESCE(s.database::text, '-'),
    COALESCE(s.plugin::text, '-'),
    s.active,
    s.active_pid,
    COALESCE(s.restart_lsn::text, '-'),
    COALESCE(s.confirmed_flush_lsn::text, '-'),
    COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn)::bigint, 0) AS retained_wal_bytes,
    COALESCE(pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn)::bigint), '0 B') AS retained_wal_pretty,
    CASE
      WHEN NOT s.active AND COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn), 0) > 1073741824 THEN 'critical'
      WHEN NOT s.active AND COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn), 0) > 268435456 THEN 'warning'
      WHEN COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn), 0) > 5368709120 THEN 'warning'
      ELSE 'ok'
    END AS severity,
    CASE
      WHEN NOT s.active AND COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn), 0) > 1073741824
        THEN 'Slot inativo retendo WAL. Reative o consumidor ou remova o slot para liberar espaço em disco.'
      WHEN NOT s.active
        THEN 'Slot inativo. Monitorar crescimento do WAL retido.'
      WHEN COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn), 0) > 5368709120
        THEN 'Consumidor está atrasado. Verificar lag da replicação.'
      ELSE 'Slot saudável.'
    END AS recommendation
  FROM pg_replication_slots s
  ORDER BY COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), s.restart_lsn), 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_replication_slot_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_replication_slot_status() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_replication_slot_status() IS
'Onda 86: Monitor de slots de replicação — detecta slots inativos retendo WAL (risco de disk full). Admin-only.';