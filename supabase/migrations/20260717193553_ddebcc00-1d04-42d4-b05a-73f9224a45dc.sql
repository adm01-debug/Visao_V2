CREATE OR REPLACE FUNCTION public.calculate_media_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  IF NEW.expires_at IS NULL THEN
    retention_days := CASE NEW.retention_class
      WHEN 'standard' THEN 30
      WHEN 'extended' THEN 180
      WHEN 'forensic' THEN 2555
      ELSE 30
    END;
    NEW.expires_at := NEW.captured_at + (retention_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_media_assets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_media_expiration() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_media_assets_updated_at() FROM PUBLIC, anon;