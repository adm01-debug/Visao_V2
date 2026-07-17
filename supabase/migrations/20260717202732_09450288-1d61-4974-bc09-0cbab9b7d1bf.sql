CREATE TABLE IF NOT EXISTS public.glacier_stuck_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  alerted_at timestamptz NOT NULL DEFAULT now(),
  hours_stuck numeric NOT NULL,
  channel text NOT NULL DEFAULT 'telegram',
  delivered boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glacier_stuck_alerts_asset_time
  ON public.glacier_stuck_alerts (asset_id, alerted_at DESC);

GRANT SELECT ON public.glacier_stuck_alerts TO authenticated;
GRANT ALL ON public.glacier_stuck_alerts TO service_role;

ALTER TABLE public.glacier_stuck_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view glacier stuck alerts"
ON public.glacier_stuck_alerts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.find_glacier_stuck_pending_alert(_hours_threshold int DEFAULT 12, _dedup_window_hours int DEFAULT 6)
RETURNS TABLE (
  asset_id uuid,
  user_id uuid,
  object_key text,
  hours_stuck numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.user_id,
    m.object_key,
    ROUND(EXTRACT(EPOCH FROM (now() - m.restore_requested_at))/3600.0, 2)
  FROM public.media_assets m
  WHERE m.storage_tier = 'cold'
    AND m.restore_status::text = 'in_progress'
    AND m.restore_requested_at < now() - make_interval(hours => _hours_threshold)
    AND NOT EXISTS (
      SELECT 1 FROM public.glacier_stuck_alerts a
      WHERE a.asset_id = m.id
        AND a.alerted_at > now() - make_interval(hours => _dedup_window_hours)
    )
  ORDER BY m.restore_requested_at ASC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.find_glacier_stuck_pending_alert(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_glacier_stuck_pending_alert(int, int) TO service_role;