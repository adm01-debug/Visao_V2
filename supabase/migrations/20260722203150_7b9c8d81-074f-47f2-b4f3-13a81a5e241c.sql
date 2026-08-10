-- Wave 7 + 8: RPC transacional apply_camera_setup com auditoria embutida
CREATE OR REPLACE FUNCTION public.apply_camera_setup(
  _camera_id uuid,
  _zones jsonb,
  _rules jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owns boolean;
  _z jsonb;
  _r jsonb;
  _new_zone_id uuid;
  _new_rule_id uuid;
  _zone_ids uuid[] := ARRAY[]::uuid[];
  _rule_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cameras WHERE id = _camera_id AND user_id = _uid
  ) INTO _owns;

  IF NOT _owns THEN
    RAISE EXCEPTION 'camera_not_found_or_forbidden' USING ERRCODE = '42501';
  END IF;

  -- Inserir zonas
  FOR _z IN SELECT * FROM jsonb_array_elements(COALESCE(_zones, '[]'::jsonb))
  LOOP
    INSERT INTO public.zones (camera_id, user_id, name, type, points, color)
    VALUES (
      _camera_id, _uid,
      COALESCE(_z->>'name', 'Zona'),
      COALESCE(_z->>'type', 'custom'),
      COALESCE(_z->'points', '[]'::jsonb),
      COALESCE(_z->>'color', 'hsl(var(--primary))')
    )
    RETURNING id INTO _new_zone_id;
    _zone_ids := array_append(_zone_ids, _new_zone_id);
  END LOOP;

  -- Inserir regras
  FOR _r IN SELECT * FROM jsonb_array_elements(COALESCE(_rules, '[]'::jsonb))
  LOOP
    INSERT INTO public.rules (
      user_id, name, description, category, severity,
      conditions, actions, cameras, zone_id,
      schedule_cron, schedule_tz, is_active
    ) VALUES (
      _uid,
      COALESCE(_r->>'name', 'Regra'),
      _r->>'description',
      COALESCE(_r->>'category', 'security')::rule_category,
      COALESCE(_r->>'severity', 'medium')::rule_severity,
      COALESCE(_r->'conditions', '[]'::jsonb),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_r->'actions'))::rule_action[], ARRAY[]::rule_action[]),
      ARRAY[_camera_id],
      NULLIF(_r->>'zone_id','')::uuid,
      _r->>'schedule_cron',
      COALESCE(_r->>'schedule_tz', 'America/Sao_Paulo'),
      COALESCE((_r->>'is_active')::boolean, true)
    )
    RETURNING id INTO _new_rule_id;
    _rule_ids := array_append(_rule_ids, _new_rule_id);
  END LOOP;

  -- Auditoria
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    _uid, 'wizard.camera_setup.applied', 'camera', _camera_id,
    jsonb_build_object(
      'zone_ids', to_jsonb(_zone_ids),
      'rule_ids', to_jsonb(_rule_ids),
      'zones_count', array_length(_zone_ids, 1),
      'rules_count', array_length(_rule_ids, 1)
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'camera_id', _camera_id,
    'zone_ids', to_jsonb(_zone_ids),
    'rule_ids', to_jsonb(_rule_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_camera_setup(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_camera_setup(uuid, jsonb, jsonb) TO authenticated;

-- Wave 10: telemetria do wizard
CREATE TABLE IF NOT EXISTS public.wizard_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wizard_name text NOT NULL,
  event text NOT NULL CHECK (event IN ('started','step_completed','abandoned','completed')),
  step text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.wizard_telemetry TO authenticated;
GRANT ALL ON public.wizard_telemetry TO service_role;

ALTER TABLE public.wizard_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wizard_telemetry_self_insert" ON public.wizard_telemetry
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wizard_telemetry_self_select" ON public.wizard_telemetry
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_wizard_telemetry_user_created
  ON public.wizard_telemetry (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wizard_telemetry_event
  ON public.wizard_telemetry (wizard_name, event);
