
-- Função auxiliar imutável para validar dias 0-6
CREATE OR REPLACE FUNCTION public.array_days_valid(days integer[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT days IS NULL OR NOT (days && ARRAY(SELECT g FROM generate_series(-1000, -1) g)
                              OR days && ARRAY(SELECT g FROM generate_series(7, 1000) g));
$$;

-- Alternativa mais simples e realmente immutable: min/max com unnest é volátil no planner.
-- Substitui por checagem via range int4range que aceita @> com valores escalares.
CREATE OR REPLACE FUNCTION public.array_days_valid(days integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE d integer;
BEGIN
  IF days IS NULL THEN RETURN true; END IF;
  FOREACH d IN ARRAY days LOOP
    IF d < 0 OR d > 6 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

-- ZONES
ALTER TABLE public.zones
  ADD CONSTRAINT zones_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID,
  ADD CONSTRAINT zones_type_valid CHECK (type IN ('restricted','counting','heatmap','entry','exit','safe')) NOT VALID;

ALTER TABLE public.zones VALIDATE CONSTRAINT zones_name_not_blank;
ALTER TABLE public.zones VALIDATE CONSTRAINT zones_type_valid;

-- RULES
ALTER TABLE public.rules
  ADD CONSTRAINT rules_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID;
ALTER TABLE public.rules VALIDATE CONSTRAINT rules_name_not_blank;

-- NOTIFICATION_CONFIGS
ALTER TABLE public.notification_configs
  ADD CONSTRAINT notif_cooldown_range CHECK (cooldown_minutes BETWEEN 0 AND 1440) NOT VALID,
  ADD CONSTRAINT notif_channels_valid CHECK (
    channels <@ ARRAY['email','sms','webhook','push','telegram','whatsapp','slack']::text[]
  ) NOT VALID,
  ADD CONSTRAINT notif_severity_filter_valid CHECK (
    severity_filter <@ ARRAY['low','medium','high','critical','info']::text[]
  ) NOT VALID,
  ADD CONSTRAINT notif_time_format CHECK (
    (schedule_start_time IS NULL OR schedule_start_time ~ '^[0-2][0-9]:[0-5][0-9]$') AND
    (schedule_end_time IS NULL OR schedule_end_time ~ '^[0-2][0-9]:[0-5][0-9]$')
  ) NOT VALID,
  ADD CONSTRAINT notif_days_valid CHECK (public.array_days_valid(schedule_days)) NOT VALID;

ALTER TABLE public.notification_configs VALIDATE CONSTRAINT notif_cooldown_range;
ALTER TABLE public.notification_configs VALIDATE CONSTRAINT notif_channels_valid;
ALTER TABLE public.notification_configs VALIDATE CONSTRAINT notif_severity_filter_valid;
ALTER TABLE public.notification_configs VALIDATE CONSTRAINT notif_time_format;
ALTER TABLE public.notification_configs VALIDATE CONSTRAINT notif_days_valid;
