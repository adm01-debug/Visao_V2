
-- Onda 7: Fechar findings warn do security scan

-- 1) panic_events: permitir admins/managers verem e resolverem eventos de pânico (emergência)
CREATE POLICY "Admins and managers can view all panic events"
  ON public.panic_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update panic events"
  ON public.panic_events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 2) camera_detection_rules: garantir consistência camera_id x organization_id
-- A câmera referenciada deve pertencer a um usuário membro da organização.
CREATE OR REPLACE FUNCTION public.validate_cdr_camera_org_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cam_owner uuid;
BEGIN
  SELECT user_id INTO cam_owner FROM public.cameras WHERE id = NEW.camera_id;
  IF cam_owner IS NULL THEN
    RAISE EXCEPTION 'Câmera % não encontrada', NEW.camera_id USING ERRCODE = '23503';
  END IF;
  IF NOT public.is_org_member(NEW.organization_id, cam_owner) THEN
    RAISE EXCEPTION 'Câmera % não pertence à organização %', NEW.camera_id, NEW.organization_id
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cdr_camera_org ON public.camera_detection_rules;
CREATE TRIGGER trg_validate_cdr_camera_org
  BEFORE INSERT OR UPDATE OF camera_id, organization_id ON public.camera_detection_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_cdr_camera_org_consistency();
