-- ============================================================================
-- Onda 124 — Ingestão RTMP/SRT push (sem abertura de portas na ponta)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.camera_ingest_endpoints (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  camera_id            uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  protocol             text NOT NULL DEFAULT 'rtmp_push'
                         CHECK (protocol IN ('rtsp_pull','rtmp_push','srt_push')),
  stream_key           text NOT NULL,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','publishing','idle','revoked')),
  last_publish_at      timestamptz,
  last_unpublish_at    timestamptz,
  last_publish_ip      text,
  publish_count        integer NOT NULL DEFAULT 0 CHECK (publish_count >= 0),
  stale_after_seconds  integer NOT NULL DEFAULT 300
                         CHECK (stale_after_seconds BETWEEN 60 AND 86400),
  rotated_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT camera_ingest_endpoints_stream_key_key UNIQUE (stream_key),
  CONSTRAINT camera_ingest_endpoints_camera_protocol_key UNIQUE (camera_id, protocol),
  -- Chave de publicação precisa ter entropia suficiente (>= 32 chars hex).
  CONSTRAINT camera_ingest_endpoints_stream_key_shape
    CHECK (stream_key ~ '^[a-f0-9]{32,64}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_ingest_endpoints TO authenticated;
GRANT ALL ON public.camera_ingest_endpoints TO service_role;
REVOKE ALL ON public.camera_ingest_endpoints FROM anon;

ALTER TABLE public.camera_ingest_endpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'camera_ingest_endpoints'
      AND policyname = 'camera_ingest_endpoints_user_isolation'
  ) THEN
    CREATE POLICY camera_ingest_endpoints_user_isolation
      ON public.camera_ingest_endpoints
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_camera_ingest_endpoints_user
  ON public.camera_ingest_endpoints (user_id);
CREATE INDEX IF NOT EXISTS idx_camera_ingest_endpoints_camera
  ON public.camera_ingest_endpoints (camera_id);
CREATE INDEX IF NOT EXISTS idx_camera_ingest_endpoints_stale
  ON public.camera_ingest_endpoints (status, last_publish_at)
  WHERE protocol IN ('rtmp_push','srt_push');

CREATE OR REPLACE FUNCTION public.touch_camera_ingest_endpoints()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  -- Rotação de chave é fato auditável, não um UPDATE qualquer.
  IF TG_OP = 'UPDATE' AND NEW.stream_key IS DISTINCT FROM OLD.stream_key THEN
    NEW.rotated_at := now();
    NEW.status := CASE WHEN NEW.status = 'revoked' THEN 'revoked' ELSE 'pending' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_camera_ingest_endpoints ON public.camera_ingest_endpoints;
CREATE TRIGGER trg_touch_camera_ingest_endpoints
  BEFORE UPDATE ON public.camera_ingest_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.touch_camera_ingest_endpoints();

-- ----------------------------------------------------------------------------
-- Geração de chave sem depender de pgcrypto: dois UUIDv4 => 64 chars hex.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_ingest_stream_key()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '') ||
         replace(gen_random_uuid()::text, '-', '');
$$;

REVOKE ALL ON FUNCTION public.generate_ingest_stream_key() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_ingest_stream_key() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Autorização de publicação (chamada pelo servidor de mídia via edge function).
-- Nunca revela por que falhou além do necessário; nunca vaza outra câmera.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize_ingest_publish(
  _stream_key text,
  _client_ip  text DEFAULT NULL,
  _protocol   text DEFAULT 'rtmp_push'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ep record;
BEGIN
  IF _stream_key IS NULL OR _stream_key !~ '^[a-f0-9]{32,64}$' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'malformed_key');
  END IF;

  SELECT * INTO ep
  FROM public.camera_ingest_endpoints
  WHERE stream_key = _stream_key
  FOR UPDATE;

  IF ep IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_key');
  END IF;

  IF ep.status = 'revoked' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'revoked_key');
  END IF;

  IF ep.protocol <> _protocol THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'protocol_mismatch');
  END IF;

  UPDATE public.camera_ingest_endpoints
     SET status          = 'publishing',
         last_publish_at = now(),
         last_publish_ip = _client_ip,
         publish_count   = publish_count + 1
   WHERE id = ep.id;

  RETURN jsonb_build_object(
    'allowed',   true,
    'camera_id', ep.camera_id,
    'user_id',   ep.user_id,
    'protocol',  ep.protocol,
    'first_publish', ep.last_publish_at IS NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_ingest_publish(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorize_ingest_publish(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_ingest_unpublish(_stream_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated int;
BEGIN
  UPDATE public.camera_ingest_endpoints
     SET status = CASE WHEN status = 'revoked' THEN 'revoked' ELSE 'idle' END,
         last_unpublish_at = now()
   WHERE stream_key = _stream_key;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN jsonb_build_object('ok', updated > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_ingest_unpublish(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_ingest_unpublish(text) TO service_role;

-- ----------------------------------------------------------------------------
-- Detector de silêncio: câmera que deveria empurrar vídeo e parou.
-- Entra no barramento de manutenção com a mesma janela de anti-repetição.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.detect_stale_ingest_publishers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cooldown_hours constant int := 6;
  silent_count   int := 0;
  never_count    int := 0;
  emitted        int := 0;
  suppressed     int := 0;
  severity       text;
  reason         text;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  SELECT
    count(*) FILTER (
      WHERE last_publish_at IS NOT NULL
        AND last_publish_at < now() - make_interval(secs => stale_after_seconds)
    ),
    count(*) FILTER (
      WHERE last_publish_at IS NULL
        AND created_at < now() - make_interval(secs => stale_after_seconds)
    )
  INTO silent_count, never_count
  FROM public.camera_ingest_endpoints
  WHERE protocol IN ('rtmp_push','srt_push')
    AND status <> 'revoked';

  IF silent_count > 0 THEN
    severity := 'critical';
    reason   := format('%s câmera(s) em modo envio pararam de publicar', silent_count);
  ELSIF never_count > 0 THEN
    severity := 'warning';
    reason   := format('%s câmera(s) em modo envio nunca publicaram', never_count);
  END IF;

  IF severity IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
      WHERE e.routine = 'camera_ingest_publish'
        AND e.severity = severity
        AND e.created_at > now() - make_interval(hours => cooldown_hours)
    ) THEN
      suppressed := 1;
    ELSE
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES ('camera_ingest_publish', severity, reason,
              jsonb_build_object('silent', silent_count, 'never_published', never_count),
              now());
      emitted := 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'silent', silent_count,
    'never_published', never_count,
    'severity', COALESCE(severity, 'none'),
    'reason', COALESCE(reason, 'saudável'),
    'emitted', emitted,
    'suppressed', suppressed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.detect_stale_ingest_publishers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_stale_ingest_publishers() TO service_role;