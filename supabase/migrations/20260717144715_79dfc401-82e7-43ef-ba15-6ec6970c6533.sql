
-- =========================================================
-- PTZ CONTROL SYSTEM
-- =========================================================

-- 0. Add ptz_capable flag on cameras
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS ptz_capable boolean NOT NULL DEFAULT false;

-- =========================================================
-- 1. camera_ptz_config
-- =========================================================
CREATE TABLE IF NOT EXISTS public.camera_ptz_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL UNIQUE REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  protocol text NOT NULL CHECK (protocol IN ('onvif','hikvision','dahua','axis')),
  endpoint text NOT NULL,
  port integer NOT NULL DEFAULT 80 CHECK (port BETWEEN 1 AND 65535),
  username text,
  password_encrypted text,
  channel integer NOT NULL DEFAULT 1 CHECK (channel BETWEEN 1 AND 64),
  capabilities jsonb NOT NULL DEFAULT '{"pan":true,"tilt":true,"zoom":true,"focus":false,"iris":false,"presets":true,"patrols":true}'::jsonb,
  default_speed integer NOT NULL DEFAULT 5 CHECK (default_speed BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_ptz_config TO authenticated;
GRANT ALL ON public.camera_ptz_config TO service_role;

ALTER TABLE public.camera_ptz_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ptz_config_owner_or_admin_select" ON public.camera_ptz_config
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ptz_config_owner_or_admin_insert" ON public.camera_ptz_config
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ptz_config_owner_or_admin_update" ON public.camera_ptz_config
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ptz_config_owner_or_admin_delete" ON public.camera_ptz_config
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ptz_config_updated_at
  BEFORE UPDATE ON public.camera_ptz_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. camera_presets
-- =========================================================
CREATE TABLE IF NOT EXISTS public.camera_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  preset_number integer NOT NULL CHECK (preset_number BETWEEN 1 AND 32),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  ptz_position jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url text,
  is_home boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (camera_id, preset_number)
);

CREATE INDEX IF NOT EXISTS idx_camera_presets_camera ON public.camera_presets(camera_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_camera_presets_home
  ON public.camera_presets(camera_id) WHERE is_home;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_presets TO authenticated;
GRANT ALL ON public.camera_presets TO service_role;

ALTER TABLE public.camera_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presets_owner_or_admin_select" ON public.camera_presets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "presets_owner_or_admin_insert" ON public.camera_presets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "presets_owner_or_admin_update" ON public.camera_presets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "presets_owner_or_admin_delete" ON public.camera_presets
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_camera_presets_updated_at
  BEFORE UPDATE ON public.camera_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. camera_patrols
-- =========================================================
CREATE TABLE IF NOT EXISTS public.camera_patrols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  loop_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  current_stop_index integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camera_patrols_camera ON public.camera_patrols(camera_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_patrols TO authenticated;
GRANT ALL ON public.camera_patrols TO service_role;

ALTER TABLE public.camera_patrols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patrols_owner_or_admin_select" ON public.camera_patrols
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "patrols_owner_or_admin_insert" ON public.camera_patrols
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "patrols_owner_or_admin_update" ON public.camera_patrols
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "patrols_owner_or_admin_delete" ON public.camera_patrols
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_camera_patrols_updated_at
  BEFORE UPDATE ON public.camera_patrols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. camera_patrol_stops
-- =========================================================
CREATE TABLE IF NOT EXISTS public.camera_patrol_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_id uuid NOT NULL REFERENCES public.camera_patrols(id) ON DELETE CASCADE,
  preset_id uuid NOT NULL REFERENCES public.camera_presets(id) ON DELETE CASCADE,
  stop_order integer NOT NULL CHECK (stop_order >= 0),
  dwell_seconds integer NOT NULL DEFAULT 10 CHECK (dwell_seconds BETWEEN 1 AND 3600),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patrol_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_patrol_stops_patrol ON public.camera_patrol_stops(patrol_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_patrol_stops TO authenticated;
GRANT ALL ON public.camera_patrol_stops TO service_role;

ALTER TABLE public.camera_patrol_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patrol_stops_via_patrol_select" ON public.camera_patrol_stops
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camera_patrols p
    WHERE p.id = patrol_id
      AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "patrol_stops_via_patrol_insert" ON public.camera_patrol_stops
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.camera_patrols p
    WHERE p.id = patrol_id
      AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "patrol_stops_via_patrol_update" ON public.camera_patrol_stops
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camera_patrols p
    WHERE p.id = patrol_id
      AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "patrol_stops_via_patrol_delete" ON public.camera_patrol_stops
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camera_patrols p
    WHERE p.id = patrol_id
      AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- =========================================================
-- 5. camera_ptz_locks (cooperative lock, TTL ~10s)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.camera_ptz_locks (
  camera_id uuid PRIMARY KEY REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 seconds'
);

CREATE INDEX IF NOT EXISTS idx_ptz_locks_expires ON public.camera_ptz_locks(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_ptz_locks TO authenticated;
GRANT ALL ON public.camera_ptz_locks TO service_role;

ALTER TABLE public.camera_ptz_locks ENABLE ROW LEVEL SECURITY;

-- Any operator that can see the camera can see the lock (to show "in use by ...")
CREATE POLICY "ptz_locks_camera_visible_select" ON public.camera_ptz_locks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cameras c
    WHERE c.id = camera_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ));

-- Insert/update/delete via edge function (service_role) — deny direct client writes
-- (no INSERT/UPDATE/DELETE policies for authenticated)

-- =========================================================
-- 6. Acquire / release lock RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.acquire_ptz_lock(_camera_id uuid, _ttl_seconds integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_now timestamptz := now();
  v_existing record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin') OR
    public.has_role(v_uid, 'manager') OR
    public.has_role(v_uid, 'operator')
  ) THEN
    RAISE EXCEPTION 'Papel insuficiente para operar PTZ' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT * INTO v_existing FROM public.camera_ptz_locks WHERE camera_id = _camera_id;

  IF v_existing.camera_id IS NOT NULL
     AND v_existing.user_id <> v_uid
     AND v_existing.expires_at > v_now THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'locked_by', v_existing.user_email,
      'expires_at', v_existing.expires_at
    );
  END IF;

  INSERT INTO public.camera_ptz_locks(camera_id, user_id, user_email, acquired_at, expires_at)
  VALUES (_camera_id, v_uid, v_email, v_now, v_now + make_interval(secs => COALESCE(_ttl_seconds, 10)))
  ON CONFLICT (camera_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        user_email = EXCLUDED.user_email,
        acquired_at = EXCLUDED.acquired_at,
        expires_at = EXCLUDED.expires_at;

  RETURN jsonb_build_object('acquired', true, 'expires_at', v_now + make_interval(secs => COALESCE(_ttl_seconds, 10)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_ptz_lock(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.release_ptz_lock(_camera_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.camera_ptz_locks
  WHERE camera_id = _camera_id
    AND (user_id = v_uid OR public.has_role(v_uid, 'admin'));

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_ptz_lock(uuid) TO authenticated;
