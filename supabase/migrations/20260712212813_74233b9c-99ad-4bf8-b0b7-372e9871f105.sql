CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é append-only: % não é permitido', TG_OP
    USING ERRCODE = '42501';
END;
$$;