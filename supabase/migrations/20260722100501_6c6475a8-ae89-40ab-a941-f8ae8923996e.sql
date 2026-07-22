
-- 1) Tabela de amostras de banda
CREATE TABLE public.camera_bandwidth_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_seconds INTEGER NOT NULL DEFAULT 60 CHECK (window_seconds > 0),
  bytes_received BIGINT NOT NULL DEFAULT 0 CHECK (bytes_received >= 0),
  bitrate_kbps NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (bitrate_kbps >= 0),
  fps NUMERIC(6,2),
  resolution TEXT,
  stream_type TEXT NOT NULL DEFAULT 'main' CHECK (stream_type IN ('main','sub','hls','webrtc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cbs_camera_time ON public.camera_bandwidth_samples (camera_id, sampled_at DESC);
CREATE INDEX idx_cbs_user_time ON public.camera_bandwidth_samples (user_id, sampled_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_bandwidth_samples TO authenticated;
GRANT ALL ON public.camera_bandwidth_samples TO service_role;

ALTER TABLE public.camera_bandwidth_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage bandwidth samples"
  ON public.camera_bandwidth_samples FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) View agregada por hora
CREATE OR REPLACE VIEW public.camera_bandwidth_hourly
WITH (security_invoker = true) AS
SELECT
  camera_id,
  user_id,
  date_trunc('hour', sampled_at) AS hour_bucket,
  SUM(bytes_received) AS total_bytes,
  AVG(bitrate_kbps)::NUMERIC(10,2) AS avg_bitrate_kbps,
  MAX(bitrate_kbps)::NUMERIC(10,2) AS peak_bitrate_kbps,
  COUNT(*) AS sample_count
FROM public.camera_bandwidth_samples
GROUP BY camera_id, user_id, date_trunc('hour', sampled_at);

GRANT SELECT ON public.camera_bandwidth_hourly TO authenticated;

-- 3) Função de sumário
CREATE OR REPLACE FUNCTION public.get_bandwidth_summary(days INTEGER DEFAULT 7)
RETURNS TABLE (
  camera_id UUID,
  camera_name TEXT,
  total_gb NUMERIC,
  avg_bitrate_kbps NUMERIC,
  peak_bitrate_kbps NUMERIC,
  sample_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id AS camera_id,
    c.name AS camera_name,
    ROUND((COALESCE(SUM(s.bytes_received),0) / 1073741824.0)::NUMERIC, 3) AS total_gb,
    ROUND(COALESCE(AVG(s.bitrate_kbps),0)::NUMERIC, 2) AS avg_bitrate_kbps,
    ROUND(COALESCE(MAX(s.bitrate_kbps),0)::NUMERIC, 2) AS peak_bitrate_kbps,
    COUNT(s.id) AS sample_count
  FROM public.cameras c
  LEFT JOIN public.camera_bandwidth_samples s
    ON s.camera_id = c.id
   AND s.sampled_at >= now() - make_interval(days => days)
  WHERE c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  GROUP BY c.id, c.name
  ORDER BY total_gb DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bandwidth_summary(INTEGER) TO authenticated;

-- 4) Purga automática (> 30 dias)
CREATE OR REPLACE FUNCTION public.purge_bandwidth_samples()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.camera_bandwidth_samples
   WHERE sampled_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5) Agendamento diário (03:15 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-bandwidth-samples-daily';
    PERFORM cron.schedule(
      'purge-bandwidth-samples-daily',
      '15 3 * * *',
      $CRON$ SELECT public.purge_bandwidth_samples(); $CRON$
    );
  END IF;
END $$;
