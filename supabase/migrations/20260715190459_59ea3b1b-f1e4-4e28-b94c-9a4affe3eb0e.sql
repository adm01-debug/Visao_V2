
REVOKE EXECUTE ON FUNCTION public.validate_cdr_camera_org_consistency() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_cdr_camera_org_consistency() TO service_role;
