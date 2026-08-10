-- Create enum for camera status
CREATE TYPE public.camera_status AS ENUM ('online', 'offline', 'alert', 'warning');

-- Create enum for alert type
CREATE TYPE public.alert_type AS ENUM ('security', 'safety', 'operations', 'access', 'analytics');

-- Create cameras table
CREATE TABLE public.cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  status camera_status NOT NULL DEFAULT 'offline',
  thumbnail TEXT,
  last_activity TIMESTAMP WITH TIME ZONE,
  detected_people INTEGER DEFAULT 0,
  alerts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cameras
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

-- Create policy for cameras (public access for now)
CREATE POLICY "Allow all operations on cameras"
ON public.cameras
FOR ALL
USING (true)
WITH CHECK (true);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  camera_name TEXT NOT NULL,
  type alert_type NOT NULL DEFAULT 'security',
  severity rule_severity NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for alerts (public access for now)
CREATE POLICY "Allow all operations on alerts"
ON public.alerts
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_alerts_camera_id ON public.alerts(camera_id);
CREATE INDEX idx_alerts_timestamp ON public.alerts(timestamp DESC);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX idx_cameras_status ON public.cameras(status);

-- Create trigger for cameras updated_at
CREATE TRIGGER update_cameras_updated_at
BEFORE UPDATE ON public.cameras
FOR EACH ROW
EXECUTE FUNCTION public.update_rules_updated_at();