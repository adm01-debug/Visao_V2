REVOKE ALL ON FUNCTION public.block_io_actuation_log_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_io_actuation_log_mutation() TO service_role;