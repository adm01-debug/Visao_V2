-- ============================================================
-- Onda 177 — Tratativa de alarme (paridade SIM Next §Alarme)
-- Espelho servidor de src/lib/alarms/alarmTreatment.ts
-- ============================================================

-- 1. Desfecho persistido no alarme -------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.alarm_resolution_code AS ENUM (
    'incident_confirmed','handled_on_site','no_action_needed',
    'false_positive','duplicate','test'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.event_alerts
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS resolution_code public.alarm_resolution_code;

-- 2. Trilha imutável de tratativas -------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_alert_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.event_alerts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('acknowledge','resolve','dismiss','reopen')),
  from_status public.event_alert_status NOT NULL,
  to_status public.event_alert_status NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 2000),
  resolution_code public.alarm_resolution_code,
  actor_id uuid NOT NULL,
  acted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_treatments_alert
  ON public.event_alert_treatments (alert_id, acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_treatments_org
  ON public.event_alert_treatments (organization_id, acted_at DESC);

-- Default privileges do papel postgres concedem tudo a anon: revogar sempre.
REVOKE ALL ON public.event_alert_treatments FROM anon;
REVOKE ALL ON public.event_alert_treatments FROM authenticated;
GRANT SELECT ON public.event_alert_treatments TO authenticated;
GRANT ALL ON public.event_alert_treatments TO service_role;

ALTER TABLE public.event_alert_treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ealert_treatments_select ON public.event_alert_treatments;
CREATE POLICY ealert_treatments_select ON public.event_alert_treatments
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

-- Trilha é append-only e a escrita só acontece dentro da RPC (definer).
CREATE OR REPLACE FUNCTION public.block_alert_treatment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'event_alert_treatments é imutável (append-only)';
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_treatments_immutable ON public.event_alert_treatments;
CREATE TRIGGER trg_alert_treatments_immutable
  BEFORE UPDATE OR DELETE ON public.event_alert_treatments
  FOR EACH ROW EXECUTE FUNCTION public.block_alert_treatment_mutation();

-- 3. Guarda de transição no próprio alarme -----------------------------------
CREATE OR REPLACE FUNCTION public.enforce_alert_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  legal boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  legal := CASE OLD.status
    WHEN 'open'         THEN NEW.status IN ('acknowledged','dismissed')
    WHEN 'acknowledged' THEN NEW.status IN ('resolved','dismissed')
    WHEN 'resolved'     THEN NEW.status = 'open'
    WHEN 'dismissed'    THEN NEW.status = 'open'
    ELSE false
  END;

  IF NOT legal THEN
    RAISE EXCEPTION 'transição de alarme inválida: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Encerramento exige autor e motivo (regras 2 e 3 da tabela-verdade).
  IF NEW.status IN ('resolved','dismissed') THEN
    IF NEW.resolved_by IS NULL THEN
      RAISE EXCEPTION 'encerramento de alarme exige autor'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.resolution_note IS NULL OR char_length(btrim(NEW.resolution_note)) < 3 THEN
      RAISE EXCEPTION 'encerramento de alarme exige motivo'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.resolution_code IS NULL THEN
      RAISE EXCEPTION 'encerramento de alarme exige código de desfecho'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'resolved'
       AND NEW.resolution_code NOT IN ('incident_confirmed','handled_on_site','no_action_needed') THEN
      RAISE EXCEPTION 'código % não vale para resolução', NEW.resolution_code
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.status = 'dismissed'
       AND NEW.resolution_code NOT IN ('false_positive','duplicate','test') THEN
      RAISE EXCEPTION 'código % não vale para descarte', NEW.resolution_code
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.status = 'acknowledged' AND NEW.acknowledged_by IS NULL THEN
    RAISE EXCEPTION 'reconhecimento de alarme exige autor'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.updated_at := GREATEST(now(), OLD.updated_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_alert_transition ON public.event_alerts;
CREATE TRIGGER trg_enforce_alert_transition
  BEFORE UPDATE ON public.event_alerts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_alert_transition();

-- 4. Porta única de escrita: RPC de tratativa --------------------------------
CREATE OR REPLACE FUNCTION public.treat_event_alert(
  p_alert_id uuid,
  p_action text,
  p_note text DEFAULT NULL,
  p_code text DEFAULT NULL
)
RETURNS public.event_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_alert public.event_alerts;
  v_from public.event_alert_status;
  v_to public.event_alert_status;
  v_note text := NULLIF(btrim(coalesce(p_note, '')), '');
  v_code public.alarm_resolution_code;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_alert FROM public.event_alerts WHERE id = p_alert_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'alarme não encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  -- Autorização explícita: a RPC é definer, então a RLS não protege sozinha.
  IF NOT public.is_org_member(v_alert.organization_id, v_actor) THEN
    RAISE EXCEPTION 'sem acesso a este alarme' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_action = 'reopen'
     AND NOT public.has_org_role(v_alert.organization_id, v_actor,
                                 ARRAY['owner','admin']::org_role[]) THEN
    RAISE EXCEPTION 'reabertura exige perfil de administração'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_from := v_alert.status;
  v_to := CASE p_action
    WHEN 'acknowledge' THEN 'acknowledged'
    WHEN 'resolve'     THEN 'resolved'
    WHEN 'dismiss'     THEN 'dismissed'
    WHEN 'reopen'      THEN 'open'
    ELSE NULL
  END::public.event_alert_status;

  IF v_to IS NULL THEN
    RAISE EXCEPTION 'ação de tratativa desconhecida: %', p_action
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_action IN ('resolve','dismiss') THEN
    BEGIN
      v_code := p_code::public.alarm_resolution_code;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'código de desfecho inválido: %', p_code
        USING ERRCODE = 'check_violation';
    END;
  END IF;

  UPDATE public.event_alerts SET
    status = v_to,
    acknowledged_at = CASE
      WHEN p_action = 'acknowledge' THEN now()
      WHEN p_action = 'reopen' THEN NULL
      ELSE acknowledged_at END,
    acknowledged_by = CASE
      WHEN p_action = 'acknowledge' THEN v_actor
      WHEN p_action = 'reopen' THEN NULL
      ELSE acknowledged_by END,
    resolved_at = CASE
      WHEN p_action IN ('resolve','dismiss') THEN now()
      WHEN p_action = 'reopen' THEN NULL
      ELSE resolved_at END,
    resolved_by = CASE
      WHEN p_action IN ('resolve','dismiss') THEN v_actor
      WHEN p_action = 'reopen' THEN NULL
      ELSE resolved_by END,
    resolution_note = CASE
      WHEN p_action IN ('resolve','dismiss') THEN v_note
      WHEN p_action = 'reopen' THEN NULL
      ELSE resolution_note END,
    resolution_code = CASE
      WHEN p_action IN ('resolve','dismiss') THEN v_code
      WHEN p_action = 'reopen' THEN NULL
      ELSE resolution_code END
  WHERE id = p_alert_id
  RETURNING * INTO v_alert;

  INSERT INTO public.event_alert_treatments
    (alert_id, organization_id, action, from_status, to_status, note, resolution_code, actor_id)
  VALUES
    (p_alert_id, v_alert.organization_id, p_action, v_from, v_to, v_note, v_code, v_actor);

  RETURN v_alert;
END;
$$;

REVOKE ALL ON FUNCTION public.treat_event_alert(uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.treat_event_alert(uuid, text, text, text) TO authenticated;