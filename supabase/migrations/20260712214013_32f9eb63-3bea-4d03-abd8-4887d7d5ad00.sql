
-- REGISTERED PERSONS
ALTER TABLE public.registered_persons
  ADD CONSTRAINT persons_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID,
  ADD CONSTRAINT persons_list_type_valid CHECK (list_type IS NULL OR list_type IN ('none','whitelist','blacklist','vip')) NOT VALID;

ALTER TABLE public.registered_persons VALIDATE CONSTRAINT persons_name_not_blank;
ALTER TABLE public.registered_persons VALIDATE CONSTRAINT persons_list_type_valid;

-- REGISTERED PLATES: normalize to uppercase before validation
CREATE OR REPLACE FUNCTION public.normalize_plate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plate IS NOT NULL THEN
    NEW.plate := upper(regexp_replace(NEW.plate, '[^A-Za-z0-9]', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_plate ON public.registered_plates;
CREATE TRIGGER trg_normalize_plate
  BEFORE INSERT OR UPDATE ON public.registered_plates
  FOR EACH ROW EXECUTE FUNCTION public.normalize_plate();

ALTER TABLE public.registered_plates
  ADD CONSTRAINT plates_format_valid CHECK (
    plate ~ '^[A-Z]{3}[0-9]{4}$' OR plate ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
  ) NOT VALID,
  ADD CONSTRAINT plates_list_type_valid CHECK (list_type IN ('whitelist','blacklist','vip','suspect')) NOT VALID,
  ADD CONSTRAINT plates_vehicle_type_valid CHECK (
    vehicle_type IS NULL OR vehicle_type IN ('car','motorcycle','truck','bus','van','other')
  ) NOT VALID;

ALTER TABLE public.registered_plates VALIDATE CONSTRAINT plates_format_valid;
ALTER TABLE public.registered_plates VALIDATE CONSTRAINT plates_list_type_valid;
ALTER TABLE public.registered_plates VALIDATE CONSTRAINT plates_vehicle_type_valid;

-- Unicidade por usuário para evitar duplicidade
CREATE UNIQUE INDEX IF NOT EXISTS uq_registered_plates_user_plate
  ON public.registered_plates (user_id, plate);
