
-- 1. Expand alert_type enum with Monuv-inspired types
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'absence';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'agglomeration';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'anomaly';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'panic';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'arm_disarm';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'scene_change';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'camera_offline';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'recurrent_vehicle';
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'qr_code_event';

-- 2. Expand condition_type enum with new detection types
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'absence_detection';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'agglomeration_detection';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_position';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_speed';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'anomaly_displacement';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'scene_change';
ALTER TYPE public.condition_type ADD VALUE IF NOT EXISTS 'recurrent_vehicle';

-- 3. Expand rule_action enum
ALTER TYPE public.rule_action ADD VALUE IF NOT EXISTS 'arm';
ALTER TYPE public.rule_action ADD VALUE IF NOT EXISTS 'disarm';
ALTER TYPE public.rule_action ADD VALUE IF NOT EXISTS 'panic';

-- 4. Create arm_disarm_states table
CREATE TABLE public.arm_disarm_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  camera_id uuid REFERENCES public.cameras(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'disarmed' CHECK (state IN ('armed', 'disarmed', 'scheduled')),
  armed_by_email text,
  armed_at timestamp with time zone DEFAULT now(),
  disarm_at timestamp with time zone,
  schedule_start_time text,
  schedule_end_time text,
  schedule_days integer[] DEFAULT '{1,2,3,4,5}'::integer[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.arm_disarm_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own arm_disarm_states" ON public.arm_disarm_states FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own arm_disarm_states" ON public.arm_disarm_states FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own arm_disarm_states" ON public.arm_disarm_states FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own arm_disarm_states" ON public.arm_disarm_states FOR DELETE USING (auth.uid() = user_id);

-- 5. Create panic_events table
CREATE TABLE public.panic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  user_phone text,
  latitude double precision,
  longitude double precision,
  location_address text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.panic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own panic_events" ON public.panic_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own panic_events" ON public.panic_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own panic_events" ON public.panic_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own panic_events" ON public.panic_events FOR DELETE USING (auth.uid() = user_id);

-- 6. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.arm_disarm_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_events;
