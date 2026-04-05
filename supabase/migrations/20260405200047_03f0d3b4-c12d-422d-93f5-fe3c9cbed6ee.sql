-- Drop the permissive INSERT policy that allows client-side inserts
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a restrictive policy: only service_role (triggers with SECURITY DEFINER) can insert
-- Since the trigger function audit_role_changes() uses SECURITY DEFINER, it runs as the function owner
-- We need to allow inserts only from triggers, not from client SDK
-- The approach: remove all INSERT policies for authenticated users
-- The SECURITY DEFINER trigger bypasses RLS, so no INSERT policy is needed for it

-- Also fix: ensure the audit_role_changes function handles NULL auth.uid() gracefully
-- (in case trigger fires from service_role context where auth.uid() is null)
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (_user_id, 'role_assigned', 'user_roles', NEW.id, 
            jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (_user_id, 'role_updated', 'user_roles', NEW.id,
            jsonb_build_object('role', OLD.role),
            jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (_user_id, 'role_removed', 'user_roles', OLD.id,
            jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role));
    RETURN OLD;
  END IF;
END;
$$;