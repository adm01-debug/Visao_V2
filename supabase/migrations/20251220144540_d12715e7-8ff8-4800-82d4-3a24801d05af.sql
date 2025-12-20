-- Tabela para detecções de placas (ALPR)
CREATE TABLE public.plate_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plate TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.95,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
  camera_name TEXT NOT NULL,
  image_url TEXT,
  vehicle_type TEXT DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'unknown',
  direction TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para placas registradas (whitelist/blacklist)
CREATE TABLE public.registered_plates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plate TEXT NOT NULL,
  owner_name TEXT,
  vehicle_type TEXT DEFAULT 'car',
  color TEXT,
  notes TEXT,
  list_type TEXT NOT NULL DEFAULT 'whitelist',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_plate_detections_user_id ON public.plate_detections(user_id);
CREATE INDEX idx_plate_detections_plate ON public.plate_detections(plate);
CREATE INDEX idx_plate_detections_timestamp ON public.plate_detections(timestamp DESC);
CREATE INDEX idx_plate_detections_status ON public.plate_detections(status);

CREATE INDEX idx_registered_plates_user_id ON public.registered_plates(user_id);
CREATE INDEX idx_registered_plates_plate ON public.registered_plates(plate);
CREATE INDEX idx_registered_plates_list_type ON public.registered_plates(list_type);

-- Enable RLS
ALTER TABLE public.plate_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_plates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plate_detections
CREATE POLICY "Users can view their own plate detections"
  ON public.plate_detections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plate detections"
  ON public.plate_detections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plate detections"
  ON public.plate_detections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for registered_plates
CREATE POLICY "Users can view their own registered plates"
  ON public.registered_plates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own registered plates"
  ON public.registered_plates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registered plates"
  ON public.registered_plates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registered plates"
  ON public.registered_plates FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_registered_plates_updated_at
  BEFORE UPDATE ON public.registered_plates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rules_updated_at();