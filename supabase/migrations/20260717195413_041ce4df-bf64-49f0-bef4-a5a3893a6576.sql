
CREATE OR REPLACE FUNCTION public.get_storage_tier_stats()
RETURNS TABLE (
  storage_tier text,
  retention_class text,
  asset_count bigint,
  total_bytes bigint,
  legal_hold_count bigint,
  restore_in_progress_count bigint,
  oldest_created_at timestamptz,
  newest_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ma.storage_tier::text,
    ma.retention_class::text,
    COUNT(*)::bigint AS asset_count,
    COALESCE(SUM(ma.size_bytes), 0)::bigint AS total_bytes,
    COUNT(*) FILTER (WHERE ma.legal_hold IS TRUE)::bigint AS legal_hold_count,
    COUNT(*) FILTER (WHERE ma.restore_status = 'in_progress')::bigint AS restore_in_progress_count,
    MIN(ma.created_at) AS oldest_created_at,
    MAX(ma.created_at) AS newest_created_at
  FROM public.media_assets ma
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY ma.storage_tier, ma.retention_class
  ORDER BY ma.storage_tier, ma.retention_class;
$$;

REVOKE ALL ON FUNCTION public.get_storage_tier_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_tier_stats() TO authenticated;
