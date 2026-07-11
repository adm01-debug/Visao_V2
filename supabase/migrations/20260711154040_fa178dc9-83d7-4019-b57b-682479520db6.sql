-- delete_user_data is invoked by edge function using service_role; block direct client calls.
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC, anon, authenticated;