-- Onda 217 — Persistência do esquema de alarme (espelho SQL das leis S1/S2/S5/S6/S10)

CREATE TABLE public.alarm_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  event_type TEXT NOT NULL,
  source_ids TEXT[] NOT NULL DEFAULT '{}',
  missing_source_ids TEXT[] NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule JSONB,
  face_library_ids TEXT[] NOT NULL DEFAULT '{}',
  disconnect_threshold_s INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- S1: cadastro anônimo não é auditável
  CONSTRAINT alarm_schemes_name_useful CHECK (
    length(btrim(name)) BETWEEN 1 AND 120
  ),
  -- S2: tipo fora do catálogo nunca vira "evento genérico"
  CONSTRAINT alarm_schemes_event_type_catalog CHECK (
    event_type IN (
      'motion_detection','tampering','video_loss','disk_full','disk_error',
      'device_disconnected','external_alarm','abandoned_object','missing_object',
      'tripwire','intrusion','scene_change','audio_detection','face_detected',
      'face_recognized','face_unrecognized','plate_read','plate_allowed',
      'plate_denied','tripwire_ai','intrusion_ai'
    )
  ),
  -- S10: limiar declarado dentro da faixa aceita pelo equipamento
  CONSTRAINT alarm_schemes_disconnect_range CHECK (
    disconnect_threshold_s IS NULL
    OR disconnect_threshold_s BETWEEN 30 AND 3600
  ),
  CONSTRAINT alarm_schemes_actions_is_array CHECK (jsonb_typeof(actions) = 'array')
);

CREATE INDEX idx_alarm_schemes_user ON public.alarm_schemes (user_id);
CREATE INDEX idx_alarm_schemes_event_type ON public.alarm_schemes (event_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alarm_schemes TO authenticated;
GRANT ALL ON public.alarm_schemes TO service_role;
REVOKE ALL ON public.alarm_schemes FROM anon;

ALTER TABLE public.alarm_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alarm schemes"
  ON public.alarm_schemes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all alarm schemes"
  ON public.alarm_schemes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------------
-- S5 — teto de 36 canais por evento (exibidos + gravados, contados
-- separadamente). Espelho SQL: o excedente é recusado na admissão, nunca
-- gravado em silêncio.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.alarm_scheme_channel_total(p_actions JSONB)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    COALESCE(jsonb_array_length(
      CASE WHEN jsonb_typeof(a->'displayChannelIds') = 'array' THEN a->'displayChannelIds' END
    ), 0)
    +
    COALESCE(jsonb_array_length(
      CASE WHEN jsonb_typeof(a->'recordChannelIds') = 'array' THEN a->'recordChannelIds' END
    ), 0)
  ), 0)::integer
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(p_actions) = 'array' THEN p_actions ELSE '[]'::jsonb END
  ) AS a
$$;

CREATE OR REPLACE FUNCTION public.enforce_alarm_scheme_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  -- S5
  v_total := public.alarm_scheme_channel_total(NEW.actions);
  IF v_total > 36 THEN
    RAISE EXCEPTION
      'alarm_scheme_channel_budget_exceeded: % canais (exibidos + gravados) excedem o teto de 36 por evento', v_total
      USING ERRCODE = '23514';
  END IF;

  -- S6: face_recognized exige exatamente uma biblioteca
  IF NEW.event_type = 'face_recognized'
     AND COALESCE(array_length(NEW.face_library_ids, 1), 0) <> 1 THEN
    RAISE EXCEPTION
      'alarm_scheme_face_library_required: "Face reconhecida" exige exatamente uma biblioteca de faces'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER alarm_schemes_enforce_rules
  BEFORE INSERT OR UPDATE ON public.alarm_schemes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_alarm_scheme_rules();