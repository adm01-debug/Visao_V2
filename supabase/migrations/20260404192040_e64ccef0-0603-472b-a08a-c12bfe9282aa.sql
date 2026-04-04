-- 1. Add RESTRICTIVE policy on UPDATE for user_roles
CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Add RESTRICTIVE policy on DELETE for user_roles
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Create trigger function to validate armed_by_email matches authenticated user
CREATE OR REPLACE FUNCTION public.validate_armed_by_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If armed_by_email is set, ensure it matches the authenticated user's email
  IF NEW.armed_by_email IS NOT NULL THEN
    IF NEW.armed_by_email <> (SELECT email FROM auth.users WHERE id = auth.uid()) THEN
      RAISE EXCEPTION 'armed_by_email must match the authenticated user email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create trigger on arm_disarm_states
CREATE TRIGGER trg_validate_armed_by_email
BEFORE INSERT OR UPDATE ON public.arm_disarm_states
FOR EACH ROW
EXECUTE FUNCTION public.validate_armed_by_email();