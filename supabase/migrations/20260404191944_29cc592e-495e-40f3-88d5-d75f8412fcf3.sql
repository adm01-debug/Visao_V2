-- Add a RESTRICTIVE policy to block non-admin users from inserting into user_roles
-- This provides defense-in-depth against privilege escalation
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));