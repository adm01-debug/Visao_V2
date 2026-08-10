CREATE TABLE public.productivity_metric_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  event_types TEXT[] NOT NULL DEFAULT ARRAY['alerts','panic','recognitions']::TEXT[],
  window_start TIME NOT NULL DEFAULT '00:00',
  window_end TIME NOT NULL DEFAULT '23:59',
  weekdays SMALLINT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::SMALLINT[],
  severities TEXT[] NOT NULL DEFAULT ARRAY['low','medium','high','critical']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.productivity_metric_preferences TO authenticated;
GRANT ALL ON public.productivity_metric_preferences TO service_role;

ALTER TABLE public.productivity_metric_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own productivity preferences"
ON public.productivity_metric_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_productivity_metric_preferences_updated_at
BEFORE UPDATE ON public.productivity_metric_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();