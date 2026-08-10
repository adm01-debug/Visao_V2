-- Restrict SECURITY DEFINER trigger-only functions from being called by clients
REVOKE ALL ON FUNCTION public.validate_armed_by_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_role_changes() FROM PUBLIC, anon, authenticated;

-- idempotency_keys is internal (used by edge functions via service_role). Deny all direct client access.
CREATE POLICY "Deny all direct client access"
  ON public.idempotency_keys
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);