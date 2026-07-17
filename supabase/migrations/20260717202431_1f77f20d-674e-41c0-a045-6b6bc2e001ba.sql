CREATE OR REPLACE FUNCTION public.get_glacier_restore_status(_limit int DEFAULT 100)
RETURNS TABLE (
  asset_id uuid,
  user_id uuid,
  camera_id uuid,
  object_key text,
  size_bytes bigint,
  restore_status text,
  restore_requested_at timestamptz,
  restore_available_until timestamptz,
  hours_since_request numeric,
  is_stuck boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.user_id,
    m.camera_id,
    m.object_key,
    m.size_bytes,
    m.restore_status::text,
    m.restore_requested_at,
    m.restore_available_until,
    ROUND(EXTRACT(EPOCH FROM (now() - m.restore_requested_at))/3600.0, 2) AS hours_since_request,
    (m.restore_status::text = 'in_progress' AND m.restore_requested_at < now() - interval '12 hours') AS is_stuck
  FROM public.media_assets m
  WHERE public.has_role(auth.uid(), 'admin')
    AND m.storage_tier = 'cold'
    AND m.restore_status IS NOT NULL
    AND m.restore_status::text IN ('in_progress','available','expired')
  ORDER BY
    (m.restore_status::text = 'in_progress' AND m.restore_requested_at < now() - interval '12 hours') DESC,
    m.restore_requested_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 500));
$$;

REVOKE ALL ON FUNCTION public.get_glacier_restore_status(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_glacier_restore_status(int) TO authenticated;