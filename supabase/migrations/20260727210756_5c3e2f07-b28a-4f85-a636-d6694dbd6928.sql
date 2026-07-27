ALTER TABLE public.connectivity_resolution_telemetry
  DROP CONSTRAINT IF EXISTS connectivity_resolution_telemetry_chosen_path_check;

ALTER TABLE public.connectivity_resolution_telemetry
  ADD CONSTRAINT connectivity_resolution_telemetry_chosen_path_check
  CHECK (chosen_path = ANY (ARRAY['direct','relay','vpn','port_forward','cancelled']));

CREATE OR REPLACE FUNCTION public.connectivity_failure_kind(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_code IS NULL OR btrim(p_code) = '' THEN 'none'
    WHEN lower(btrim(p_code)) = ANY (ARRAY[
      'timeout','connect_timeout','read_timeout','reset','refused',
      'connection_refused','network_unreachable','host_unreachable','protocol',
      'relay_unavailable','relay_timeout','tunnel_down','agent_offline'
    ]) THEN 'transport'
    WHEN lower(btrim(p_code)) = ANY (ARRAY[
      'unauthorized','forbidden','invalid_credentials','auth_failed',
      'credentials_missing','kek_not_configured'
    ]) THEN 'auth'
    WHEN lower(btrim(p_code)) = ANY (ARRAY[
      'private_host_blocked','dns','dns_failure','tls','tls_handshake_failed',
      'redirect_loop','invalid_url','invalid_host','no_onvif_endpoint',
      'missing_endpoint','unsupported_scheme'
    ]) THEN 'config'
    WHEN lower(btrim(p_code)) = ANY (ARRAY[
      'device_busy','no_stream','stream_unavailable','camera_offline',
      'unsupported_profile','ptz_not_supported'
    ]) THEN 'device'
    WHEN lower(btrim(p_code)) = ANY (ARRAY['aborted','cancelled','none','ok'])
      THEN 'none'
    ELSE 'config'
  END
$$;

COMMENT ON FUNCTION public.connectivity_failure_kind(text) IS
  'Onda 153 - espelho SQL de classifyPathFailure(); so transport culpa a rota.';

CREATE OR REPLACE FUNCTION public.connectivity_path_evidence(
  p_camera_id uuid,
  p_window_minutes integer DEFAULT 1440,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  path text,
  attempts integer,
  successes integer,
  consecutive_transport_failures integer,
  last_transport_failure_at timestamptz,
  last_failure_kind text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH bounded AS (
    SELECT
      t.chosen_path AS path,
      t.succeeded,
      t.created_at,
      CASE
        WHEN t.succeeded THEN 'none'
        ELSE public.connectivity_failure_kind(COALESCE(t.retry_error_code, t.error_code))
      END AS kind
    FROM public.connectivity_resolution_telemetry t
    WHERE t.camera_id = p_camera_id
      AND t.succeeded IS NOT NULL
      AND t.chosen_path <> 'cancelled'
      AND t.created_at > p_now - make_interval(mins => GREATEST(p_window_minutes, 1))
      AND t.created_at <= p_now
  ),
  ranked AS (
    SELECT
      b.*,
      row_number() OVER (PARTITION BY b.path ORDER BY b.created_at DESC, b.succeeded DESC) AS rn
    FROM bounded b
  ),
  last_ok AS (
    SELECT r.path, MIN(r.rn) AS ok_rn
    FROM ranked r
    WHERE r.succeeded
    GROUP BY r.path
  )
  SELECT
    r.path,
    COUNT(*)::integer AS attempts,
    COUNT(*) FILTER (WHERE r.succeeded)::integer AS successes,
    COUNT(*) FILTER (
      WHERE NOT r.succeeded
        AND r.kind = 'transport'
        AND r.rn < COALESCE(lo.ok_rn, 2147483647)
    )::integer AS consecutive_transport_failures,
    MAX(r.created_at) FILTER (WHERE NOT r.succeeded AND r.kind = 'transport')
      AS last_transport_failure_at,
    COALESCE((ARRAY_AGG(r.kind ORDER BY r.rn))[1], 'none') AS last_failure_kind
  FROM ranked r
  LEFT JOIN last_ok lo ON lo.path = r.path
  GROUP BY r.path, lo.ok_rn
$$;

COMMENT ON FUNCTION public.connectivity_path_evidence(uuid, integer, timestamptz) IS
  'Onda 153 - evidencia por caminho (attempts/successes/quarentena) sob RLS do chamador.';

REVOKE ALL ON FUNCTION public.connectivity_path_evidence(uuid, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connectivity_failure_kind(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.connectivity_path_evidence(uuid, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connectivity_failure_kind(text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_conn_res_tel_camera_path_created
  ON public.connectivity_resolution_telemetry (camera_id, chosen_path, created_at DESC)
  WHERE camera_id IS NOT NULL;