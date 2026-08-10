-- Create notification_configs table
CREATE TABLE public.notification_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Configuração Principal',
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels TEXT[] NOT NULL DEFAULT '{}',
  email_recipients TEXT[] NOT NULL DEFAULT '{}',
  phone_recipients TEXT[] NOT NULL DEFAULT '{}',
  webhook_urls TEXT[] NOT NULL DEFAULT '{}',
  severity_filter TEXT[] NOT NULL DEFAULT '{"high", "critical"}',
  cooldown_minutes INTEGER NOT NULL DEFAULT 5,
  schedule_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_start_time TEXT DEFAULT '08:00',
  schedule_end_time TEXT DEFAULT '22:00',
  schedule_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create face_recognition_configs table
CREATE TABLE public.face_recognition_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  match_threshold NUMERIC NOT NULL DEFAULT 0.6,
  min_face_quality NUMERIC NOT NULL DEFAULT 0.5,
  min_face_size INTEGER NOT NULL DEFAULT 80,
  detect_multiple_faces BOOLEAN NOT NULL DEFAULT true,
  max_faces_per_frame INTEGER NOT NULL DEFAULT 10,
  alert_on_unknown BOOLEAN NOT NULL DEFAULT false,
  save_unknown_faces BOOLEAN NOT NULL DEFAULT true,
  alert_cooldown INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add list_type and notes columns to registered_persons
ALTER TABLE public.registered_persons 
ADD COLUMN IF NOT EXISTS list_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable RLS
ALTER TABLE public.notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_recognition_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_configs
CREATE POLICY "Users can view their own notification configs"
ON public.notification_configs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification configs"
ON public.notification_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification configs"
ON public.notification_configs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification configs"
ON public.notification_configs FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for face_recognition_configs
CREATE POLICY "Users can view their own face recognition configs"
ON public.face_recognition_configs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own face recognition configs"
ON public.face_recognition_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own face recognition configs"
ON public.face_recognition_configs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own face recognition configs"
ON public.face_recognition_configs FOR DELETE
USING (auth.uid() = user_id);