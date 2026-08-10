
CREATE TABLE public.camera_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Condições
  target_labels TEXT[] NOT NULL DEFAULT '{}',
  target_categories TEXT[] NOT NULL DEFAULT '{}',
  min_confidence NUMERIC(5,4) NOT NULL DEFAULT 0.6 CHECK (min_confidence >= 0 AND min_confidence <= 1),
  min_count INTEGER NOT NULL DEFAULT 1 CHECK (min_count >= 1),
  zone_id UUID,
  -- Janela horária (0-6 dom-sab; HH:MM)
  active_days INTEGER[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  active_from TIME,
  active_to TIME,
  -- Ação
  alert_severity public.event_alert_severity NOT NULL DEFAULT 'medium',
  alert_title_template TEXT NOT NULL DEFAULT '{label} detectado em {camera}',
  cooldown_seconds INTEGER NOT NULL DEFAULT 60 CHECK (cooldown_seconds >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cdr_camera ON public.camera_detection_rules(camera_id) WHERE enabled;
CREATE INDEX idx_cdr_org ON public.camera_detection_rules(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_detection_rules TO authenticated;
GRANT ALL ON public.camera_detection_rules TO service_role;
ALTER TABLE public.camera_detection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cdr_select" ON public.camera_detection_rules FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "cdr_insert_admins" ON public.camera_detection_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]) AND created_by = auth.uid());
CREATE POLICY "cdr_update_admins" ON public.camera_detection_rules FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "cdr_delete_admins" ON public.camera_detection_rules FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE TRIGGER trg_cdr_updated BEFORE UPDATE ON public.camera_detection_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
