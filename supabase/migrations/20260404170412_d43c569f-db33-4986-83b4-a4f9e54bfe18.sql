-- Remove sensitive tables from Realtime publication to prevent PII data leaks
ALTER PUBLICATION supabase_realtime DROP TABLE public.panic_events;
ALTER PUBLICATION supabase_realtime DROP TABLE public.arm_disarm_states;