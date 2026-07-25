
-- Enums
DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('email','whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_dispatch_status AS ENUM ('pending','sent','skipped','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Recipients
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  whatsapp_phone TEXT,
  min_severity public.event_alert_severity NOT NULL DEFAULT 'medium',
  channels public.notification_channel[] NOT NULL DEFAULT ARRAY['email','whatsapp']::public.notification_channel[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_recipients_has_channel CHECK (
    (email IS NOT NULL AND 'email' = ANY(channels)) OR
    (whatsapp_phone IS NOT NULL AND 'whatsapp' = ANY(channels))
  ),
  CONSTRAINT notification_recipients_wa_e164 CHECK (
    whatsapp_phone IS NULL OR whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON public.notification_recipients(user_id) WHERE active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_recipients TO authenticated;
GRANT ALL ON public.notification_recipients TO service_role;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipients_own_select" ON public.notification_recipients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "recipients_own_insert" ON public.notification_recipients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipients_own_update" ON public.notification_recipients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipients_own_delete" ON public.notification_recipients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Dispatches
CREATE TABLE IF NOT EXISTS public.notification_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_id UUID NOT NULL REFERENCES public.event_alerts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.notification_recipients(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL,
  status public.notification_dispatch_status NOT NULL DEFAULT 'pending',
  severity public.event_alert_severity NOT NULL,
  camera_id UUID,
  camera_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  wa_link TEXT,
  destination TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_by UUID,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatches_user_status ON public.notification_dispatches(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatches_alert ON public.notification_dispatches(alert_id);

GRANT SELECT, UPDATE ON public.notification_dispatches TO authenticated;
GRANT ALL ON public.notification_dispatches TO service_role;
ALTER TABLE public.notification_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispatches_own_select" ON public.notification_dispatches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dispatches_own_update" ON public.notification_dispatches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_dispatches;

-- updated_at trigger
CREATE TRIGGER trg_notification_recipients_updated
  BEFORE UPDATE ON public.notification_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fanout trigger
CREATE OR REPLACE FUNCTION public.fanout_alert_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camera_name TEXT;
  v_owner UUID;
  v_local_time TEXT;
  v_severity_rank INT;
  v_min_rank INT;
  r RECORD;
  v_msg TEXT;
  v_subject TEXT;
  v_wa TEXT;
BEGIN
  IF NEW.is_test THEN
    RETURN NEW;
  END IF;

  SELECT name, user_id INTO v_camera_name, v_owner FROM public.cameras WHERE id = NEW.camera_id;
  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  v_local_time := to_char(timezone('America/Sao_Paulo', NEW.triggered_at), 'DD/MM/YYYY HH24:MI:SS');
  v_severity_rank := CASE NEW.severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 END;

  v_subject := format('[%s] %s — %s', upper(NEW.severity::text), COALESCE(v_camera_name,'Câmera'), NEW.title);
  v_msg := format(E'🚨 Incidente detectado\n\nCâmera: %s\nHorário: %s (Brasília)\nSeveridade: %s\nEvento: %s\n%s',
                   COALESCE(v_camera_name,'—'),
                   v_local_time,
                   upper(NEW.severity::text),
                   NEW.title,
                   COALESCE(E'\nDetalhes: '||NEW.description, ''));

  FOR r IN
    SELECT * FROM public.notification_recipients
    WHERE user_id = v_owner AND active = TRUE
  LOOP
    v_min_rank := CASE r.min_severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 END;
    IF v_severity_rank < v_min_rank THEN
      CONTINUE;
    END IF;

    IF 'email' = ANY(r.channels) AND r.email IS NOT NULL THEN
      INSERT INTO public.notification_dispatches(user_id, alert_id, recipient_id, channel, severity, camera_id, camera_name, subject, message, destination, status)
      VALUES (v_owner, NEW.id, r.id, 'email', NEW.severity, NEW.camera_id, v_camera_name, v_subject, v_msg, r.email, 'pending');
    END IF;

    IF 'whatsapp' = ANY(r.channels) AND r.whatsapp_phone IS NOT NULL THEN
      v_wa := 'https://wa.me/' || regexp_replace(r.whatsapp_phone, '\D','','g') || '?text=' || replace(replace(replace(v_msg, ' ', '%20'), E'\n', '%0A'), '#', '%23');
      INSERT INTO public.notification_dispatches(user_id, alert_id, recipient_id, channel, severity, camera_id, camera_name, subject, message, wa_link, destination, status)
      VALUES (v_owner, NEW.id, r.id, 'whatsapp', NEW.severity, NEW.camera_id, v_camera_name, v_subject, v_msg, v_wa, r.whatsapp_phone, 'pending');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_alerts_fanout ON public.event_alerts;
CREATE TRIGGER trg_event_alerts_fanout
  AFTER INSERT ON public.event_alerts
  FOR EACH ROW EXECUTE FUNCTION public.fanout_alert_notifications();
