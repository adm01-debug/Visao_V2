
REVOKE ALL ON FUNCTION public.ensure_future_partitions(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_future_partitions(int) TO service_role;
