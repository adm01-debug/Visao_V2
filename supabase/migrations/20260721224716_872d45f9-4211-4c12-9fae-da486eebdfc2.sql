
CREATE TABLE public.motion_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'include' CHECK (mode IN ('include', 'exclude')),
  polygon JSONB NOT NULL,
  sensitivity INT NOT NULL DEFAULT 50 CHECK (sensitivity BETWEEN 0 AND 100),
  color TEXT NOT NULL DEFAULT '#22c55e',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(polygon) = 'array' AND jsonb_array_length(polygon) >= 3)
);
CREATE INDEX idx_motion_masks_camera ON public.motion_masks (camera_id) WHERE enabled = true;
CREATE INDEX idx_motion_masks_user ON public.motion_masks (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.motion_masks TO authenticated;
GRANT ALL ON public.motion_masks TO service_role;
ALTER TABLE public.motion_masks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own masks select" ON public.motion_masks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own masks insert" ON public.motion_masks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own masks update" ON public.motion_masks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own masks delete" ON public.motion_masks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_motion_masks_updated
BEFORE UPDATE ON public.motion_masks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Point-in-polygon (ray casting) em PL/pgSQL, coordenadas normalizadas 0..1
CREATE OR REPLACE FUNCTION public.point_in_polygon(_poly JSONB, _x NUMERIC, _y NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  n INT := jsonb_array_length(_poly);
  i INT := 0;
  j INT;
  xi NUMERIC; yi NUMERIC; xj NUMERIC; yj NUMERIC;
  inside BOOLEAN := false;
BEGIN
  IF n < 3 THEN RETURN false; END IF;
  j := n - 1;
  WHILE i < n LOOP
    xi := (_poly->i->>0)::NUMERIC;
    yi := (_poly->i->>1)::NUMERIC;
    xj := (_poly->j->>0)::NUMERIC;
    yj := (_poly->j->>1)::NUMERIC;
    IF ((yi > _y) <> (yj > _y))
       AND (_x < (xj - xi) * (_y - yi) / NULLIF((yj - yi), 0) + xi) THEN
      inside := NOT inside;
    END IF;
    j := i;
    i := i + 1;
  END LOOP;
  RETURN inside;
END;
$$;
REVOKE ALL ON FUNCTION public.point_in_polygon(JSONB, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.point_in_polygon(JSONB, NUMERIC, NUMERIC) TO authenticated, service_role;

-- Decide se um ponto (x,y ∈ 0..1) deve disparar detecção considerando include/exclude
CREATE OR REPLACE FUNCTION public.point_triggers_motion(_camera_id UUID, _x NUMERIC, _y NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_include BOOLEAN := false;
  in_include BOOLEAN := false;
  in_exclude BOOLEAN := false;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT mode, polygon FROM public.motion_masks
    WHERE camera_id = _camera_id AND enabled = true
  LOOP
    IF rec.mode = 'include' THEN
      has_include := true;
      IF public.point_in_polygon(rec.polygon, _x, _y) THEN in_include := true; END IF;
    ELSE
      IF public.point_in_polygon(rec.polygon, _x, _y) THEN in_exclude := true; END IF;
    END IF;
  END LOOP;
  IF in_exclude THEN RETURN false; END IF;
  IF has_include THEN RETURN in_include; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.point_triggers_motion(UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.point_triggers_motion(UUID, NUMERIC, NUMERIC) TO authenticated, service_role;
