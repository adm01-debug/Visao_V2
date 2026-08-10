ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS substream_url TEXT,
  ADD COLUMN IF NOT EXISTS substream_protocol TEXT,
  ADD COLUMN IF NOT EXISTS substream_enabled BOOLEAN NOT NULL DEFAULT false;

-- Validação leve via trigger (evita CHECK com regex custosa em UPDATE massivo)
CREATE OR REPLACE FUNCTION public.validate_camera_substream()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.substream_url IS NOT NULL AND length(NEW.substream_url) > 2048 THEN
    RAISE EXCEPTION 'substream_url excede 2048 caracteres';
  END IF;
  IF NEW.substream_protocol IS NOT NULL
     AND NEW.substream_protocol NOT IN ('hls','webrtc','rtsp') THEN
    RAISE EXCEPTION 'substream_protocol inválido: %', NEW.substream_protocol;
  END IF;
  IF NEW.substream_enabled AND NEW.substream_url IS NULL THEN
    RAISE EXCEPTION 'substream_enabled requer substream_url';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_camera_substream ON public.cameras;
CREATE TRIGGER trg_validate_camera_substream
BEFORE INSERT OR UPDATE OF substream_url, substream_protocol, substream_enabled
ON public.cameras
FOR EACH ROW EXECUTE FUNCTION public.validate_camera_substream();

COMMENT ON COLUMN public.cameras.substream_url IS 'Onda Shinobi 1: URL do stream de baixa resolução usado para análise IA (economia de CPU/banda)';
COMMENT ON COLUMN public.cameras.substream_protocol IS 'hls | webrtc | rtsp';
COMMENT ON COLUMN public.cameras.substream_enabled IS 'Se true, análise IA usa substream; playback continua no mainstream';