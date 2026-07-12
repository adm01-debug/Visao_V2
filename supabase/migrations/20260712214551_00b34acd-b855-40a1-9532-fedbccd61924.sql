
CREATE OR REPLACE FUNCTION public.array_days_valid(days integer[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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
