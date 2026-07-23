
ALTER TABLE public.cron_watchdog_escalations
  ADD COLUMN acknowledged_at TIMESTAMPTZ,
  ADD COLUMN acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN acknowledgement_note TEXT;

CREATE INDEX idx_cron_watchdog_escalations_open
  ON public.cron_watchdog_escalations (escalated_at DESC)
  WHERE acknowledged_at IS NULL;

CREATE POLICY "Admins can acknowledge escalations"
  ON public.cron_watchdog_escalations
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger para congelar campos que não devem ser modificados via ACK
CREATE OR REPLACE FUNCTION public.cron_watchdog_escalations_ack_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    -- Usuário comum (admin) só pode mudar campos de ACK
    NEW.escalated_at := OLD.escalated_at;
    NEW.jobname := OLD.jobname;
    NEW.consecutive_failures := OLD.consecutive_failures;
    NEW.last_reason := OLD.last_reason;
    NEW.delivered := OLD.delivered;
    NEW.delivery_error := OLD.delivery_error;
    NEW.dedup_key := OLD.dedup_key;
    NEW.details := OLD.details;
    NEW.created_at := OLD.created_at;
    -- Auto-preenche acknowledged_by/at quando nota é adicionada
    IF NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL THEN
      NEW.acknowledged_by := COALESCE(NEW.acknowledged_by, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cron_watchdog_escalations_ack_guard
  BEFORE UPDATE ON public.cron_watchdog_escalations
  FOR EACH ROW
  EXECUTE FUNCTION public.cron_watchdog_escalations_ack_guard();
