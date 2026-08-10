
-- Add stream_url to cameras table
ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS stream_url text;

-- Create video_clips table
CREATE TABLE public.video_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  duration integer,
  file_url text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'recording',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clips" ON public.video_clips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clips" ON public.video_clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clips" ON public.video_clips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clips" ON public.video_clips FOR DELETE USING (auth.uid() = user_id);

-- Create analysis_history table
CREATE TABLE public.analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  analysis_type text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}',
  confidence numeric,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analysis" ON public.analysis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analysis" ON public.analysis_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own analysis" ON public.analysis_history FOR DELETE USING (auth.uid() = user_id);

-- Create registered_persons table
CREATE TABLE public.registered_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  role text,
  department text,
  face_encoding jsonb,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.registered_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own persons" ON public.registered_persons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own persons" ON public.registered_persons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own persons" ON public.registered_persons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own persons" ON public.registered_persons FOR DELETE USING (auth.uid() = user_id);

-- Create zones table
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'restricted',
  points jsonb NOT NULL DEFAULT '[]',
  color text DEFAULT '#ff0000',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own zones" ON public.zones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own zones" ON public.zones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own zones" ON public.zones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own zones" ON public.zones FOR DELETE USING (auth.uid() = user_id);

-- Create zone_events table
CREATE TABLE public.zone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.zones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  detected_objects jsonb DEFAULT '[]',
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own zone events" ON public.zone_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own zone events" ON public.zone_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own zone events" ON public.zone_events FOR DELETE USING (auth.uid() = user_id);

-- Create recognition_logs table
CREATE TABLE public.recognition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id uuid REFERENCES public.cameras(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.registered_persons(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  confidence numeric,
  recognized boolean NOT NULL DEFAULT false,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recognition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recognition logs" ON public.recognition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recognition logs" ON public.recognition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recognition logs" ON public.recognition_logs FOR DELETE USING (auth.uid() = user_id);
