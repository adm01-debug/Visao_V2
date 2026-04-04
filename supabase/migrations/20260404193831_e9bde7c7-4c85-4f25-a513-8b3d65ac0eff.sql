-- Remove orphaned rows with NULL user_id before adding NOT NULL constraint
DELETE FROM public.alerts WHERE user_id IS NULL;
DELETE FROM public.cameras WHERE user_id IS NULL;
DELETE FROM public.rules WHERE user_id IS NULL;

-- Make user_id NOT NULL on alerts
ALTER TABLE public.alerts
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Make user_id NOT NULL on cameras
ALTER TABLE public.cameras
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Make user_id NOT NULL on rules
ALTER TABLE public.rules
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();