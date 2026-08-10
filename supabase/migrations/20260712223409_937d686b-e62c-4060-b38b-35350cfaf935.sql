
-- =========================================================
-- ORGANIZATIONS (empresas / tenants)
-- =========================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.org_role AS ENUM ('owner','admin','member','viewer');

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper: verifica pertencimento sem recursão de RLS
CREATE OR REPLACE FUNCTION public.is_org_member(_org UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org UUID, _user UUID, _roles public.org_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user AND role = ANY(_roles));
$$;

-- Policies organizations
CREATE POLICY "org_select_members" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "org_insert_self" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "org_update_admins" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "org_delete_owner" ON public.organizations FOR DELETE TO authenticated
  USING (public.has_org_role(id, auth.uid(), ARRAY['owner']::public.org_role[]));

-- Auto-add criador como owner
CREATE OR REPLACE FUNCTION public.add_owner_on_org_create()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members(organization_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_org_owner AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_on_org_create();
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies organization_members
CREATE POLICY "orgm_select_members" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "orgm_insert_admins" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "orgm_update_admins" ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));
CREATE POLICY "orgm_delete_admins" ON public.organization_members FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- =========================================================
-- CAMERA EVENTS (fluxo bruto)
-- =========================================================
CREATE TYPE public.camera_event_type AS ENUM (
  'motion','person_detected','vehicle_detected','face_detected','plate_detected',
  'zone_entry','zone_exit','loitering','tampering','offline','online',
  'ppe_violation','behavior_anomaly','panic','manual'
);

CREATE TABLE public.camera_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  event_type public.camera_event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  source TEXT NOT NULL DEFAULT 'ai',
  snapshot_url TEXT,
  video_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cev_org_time ON public.camera_events(organization_id, occurred_at DESC);
CREATE INDEX idx_cev_camera_time ON public.camera_events(camera_id, occurred_at DESC);
CREATE INDEX idx_cev_type ON public.camera_events(event_type);
CREATE INDEX idx_cev_metadata ON public.camera_events USING GIN (metadata);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_events TO authenticated;
GRANT ALL ON public.camera_events TO service_role;
ALTER TABLE public.camera_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cev_select" ON public.camera_events FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "cev_insert" ON public.camera_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "cev_update_admins" ON public.camera_events FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]));
CREATE POLICY "cev_delete_admins" ON public.camera_events FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- =========================================================
-- EVENT DETECTIONS (detecções estruturadas por evento)
-- =========================================================
CREATE TABLE public.event_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.camera_events(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  bbox JSONB,
  zone_id UUID,
  model_name TEXT,
  model_version TEXT,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_edet_event ON public.event_detections(event_id);
CREATE INDEX idx_edet_org_label ON public.event_detections(organization_id, label);
CREATE INDEX idx_edet_confidence ON public.event_detections(confidence);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_detections TO authenticated;
GRANT ALL ON public.event_detections TO service_role;
ALTER TABLE public.event_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edet_select" ON public.event_detections FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "edet_insert" ON public.event_detections FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "edet_update" ON public.event_detections FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]));
CREATE POLICY "edet_delete" ON public.event_detections FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

-- =========================================================
-- EVENT ALERTS (alertas derivados)
-- =========================================================
CREATE TYPE public.event_alert_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.event_alert_status AS ENUM ('open','acknowledged','resolved','dismissed');

CREATE TABLE public.event_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.camera_events(id) ON DELETE SET NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity public.event_alert_severity NOT NULL DEFAULT 'medium',
  status public.event_alert_status NOT NULL DEFAULT 'open',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  dedup_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, dedup_key)
);
CREATE INDEX idx_ealert_org_time ON public.event_alerts(organization_id, triggered_at DESC);
CREATE INDEX idx_ealert_status ON public.event_alerts(organization_id, status);
CREATE INDEX idx_ealert_severity ON public.event_alerts(organization_id, severity);
CREATE INDEX idx_ealert_camera ON public.event_alerts(camera_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_alerts TO authenticated;
GRANT ALL ON public.event_alerts TO service_role;
ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ealert_select" ON public.event_alerts FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "ealert_insert" ON public.event_alerts FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "ealert_update" ON public.event_alerts FOR UPDATE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]))
  WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','member']::public.org_role[]));
CREATE POLICY "ealert_delete" ON public.event_alerts FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE TRIGGER trg_ealert_updated BEFORE UPDATE ON public.event_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- EVENT REVIEWS (revisões manuais)
-- =========================================================
CREATE TYPE public.event_review_verdict AS ENUM ('true_positive','false_positive','false_negative','uncertain');

CREATE TABLE public.event_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES public.event_alerts(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.camera_events(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  verdict public.event_review_verdict NOT NULL,
  notes TEXT,
  original_confidence NUMERIC(5,4),
  corrected_label TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (alert_id IS NOT NULL OR event_id IS NOT NULL)
);
CREATE INDEX idx_erev_org_time ON public.event_reviews(organization_id, reviewed_at DESC);
CREATE INDEX idx_erev_alert ON public.event_reviews(alert_id);
CREATE INDEX idx_erev_event ON public.event_reviews(event_id);
CREATE INDEX idx_erev_verdict ON public.event_reviews(organization_id, verdict);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reviews TO authenticated;
GRANT ALL ON public.event_reviews TO service_role;
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erev_select" ON public.event_reviews FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "erev_insert_self" ON public.event_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()) AND reviewer_id = auth.uid());
CREATE POLICY "erev_update_self" ON public.event_reviews FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() AND public.is_org_member(organization_id, auth.uid()))
  WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "erev_delete_admins" ON public.event_reviews FOR DELETE TO authenticated
  USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.org_role[]));

CREATE TRIGGER trg_erev_updated BEFORE UPDATE ON public.event_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
