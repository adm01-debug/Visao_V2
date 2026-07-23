ALTER TABLE public.camera_ptz_config
  ADD COLUMN IF NOT EXISTS limits_version TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS limits_history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.cap_ptz_limits_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  arr jsonb;
BEGIN
  arr := COALESCE(NEW.limits_history, '[]'::jsonb);
  IF jsonb_typeof(arr) <> 'array' THEN
    NEW.limits_history := '[]'::jsonb;
  ELSIF jsonb_array_length(arr) > 10 THEN
    NEW.limits_history := (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(arr) WITH ORDINALITY AS t(elem, idx)
        ORDER BY idx
        LIMIT 10
      ) s
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cap_ptz_limits_history ON public.camera_ptz_config;
CREATE TRIGGER trg_cap_ptz_limits_history
BEFORE INSERT OR UPDATE OF limits_history ON public.camera_ptz_config
FOR EACH ROW EXECUTE FUNCTION public.cap_ptz_limits_history();