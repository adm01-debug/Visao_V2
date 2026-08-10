
-- Create triggers to connect audit_role_changes function to user_roles table
CREATE TRIGGER trg_audit_role_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

CREATE TRIGGER trg_audit_role_update
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

CREATE TRIGGER trg_audit_role_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();
