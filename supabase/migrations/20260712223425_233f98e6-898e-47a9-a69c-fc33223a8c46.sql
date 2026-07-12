
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_org_role(UUID, UUID, public.org_role[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_owner_on_org_create() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(UUID, UUID, public.org_role[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_owner_on_org_create() TO service_role;
