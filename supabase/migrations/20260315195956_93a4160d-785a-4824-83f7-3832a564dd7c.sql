
-- =============================================
-- 1. Create missing table: vehicles
-- =============================================
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plate TEXT NOT NULL,
  owner TEXT,
  model TEXT,
  color TEXT,
  type TEXT NOT NULL DEFAULT 'whitelist',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 2. Create missing table: recording_configs
-- =============================================
CREATE TABLE public.recording_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  quality TEXT NOT NULL DEFAULT 'medium',
  format TEXT NOT NULL DEFAULT 'webm',
  max_duration_seconds INTEGER NOT NULL DEFAULT 3600,
  max_file_size_mb INTEGER NOT NULL DEFAULT 500,
  retention_days INTEGER NOT NULL DEFAULT 30,
  record_on_motion BOOLEAN NOT NULL DEFAULT false,
  record_on_alert BOOLEAN NOT NULL DEFAULT true,
  pre_buffer_seconds INTEGER NOT NULL DEFAULT 5,
  post_buffer_seconds INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recording_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recording configs" ON public.recording_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recording configs" ON public.recording_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recording configs" ON public.recording_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recording configs" ON public.recording_configs FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 3. Create missing table: heatmap_snapshots
-- =============================================
CREATE TABLE public.heatmap_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  image_url TEXT,
  data_points INTEGER NOT NULL DEFAULT 0,
  max_intensity NUMERIC NOT NULL DEFAULT 0,
  min_intensity NUMERIC NOT NULL DEFAULT 0,
  avg_intensity NUMERIC NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  resolution JSONB DEFAULT '{"width": 0, "height": 0}'::jsonb,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.heatmap_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own heatmap snapshots" ON public.heatmap_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own heatmap snapshots" ON public.heatmap_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own heatmap snapshots" ON public.heatmap_snapshots FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 4. Create missing table: stream_recordings
-- =============================================
CREATE TABLE public.stream_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  stream_url TEXT,
  file_path TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  format TEXT DEFAULT 'webm',
  quality TEXT DEFAULT 'medium',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'recording',
  error_message TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stream recordings" ON public.stream_recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stream recordings" ON public.stream_recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stream recordings" ON public.stream_recordings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stream recordings" ON public.stream_recordings FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 5. Add missing UPDATE RLS policies
-- =============================================
CREATE POLICY "Users can update their own recognition logs" ON public.recognition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own analysis history" ON public.analysis_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own zone events" ON public.zone_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own rule executions" ON public.rule_executions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own plate detections" ON public.plate_detections FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 6. Enable realtime for vehicles table
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
