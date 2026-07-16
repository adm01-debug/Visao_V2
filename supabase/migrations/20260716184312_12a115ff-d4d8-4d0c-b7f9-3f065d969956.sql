REVOKE EXECUTE ON FUNCTION public.get_slow_queries(int) FROM authenticated;
-- service_role only; edge function will re-check has_role(admin) before invoking.