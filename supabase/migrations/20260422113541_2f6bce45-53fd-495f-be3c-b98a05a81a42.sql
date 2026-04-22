
-- Tabela de revisões de detecções (avaliação humana)
CREATE TABLE public.detection_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  source_table TEXT NOT NULL, -- 'alerts' | 'recognition_logs' | 'plate_detections'
  source_id UUID NOT NULL,
  camera_id UUID NULL,
  camera_name TEXT NULL,
  risk_type TEXT NOT NULL, -- ex: 'security', 'face_recognition', 'license_plate', 'ppe', 'behavior'
  model_name TEXT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('true_positive','false_positive','false_negative','uncertain')),
  original_confidence NUMERIC NULL,
  notes TEXT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_table, source_id)
);

CREATE INDEX idx_detection_reviews_user_time ON public.detection_reviews (user_id, reviewed_at DESC);
CREATE INDEX idx_detection_reviews_risk ON public.detection_reviews (user_id, risk_type);

ALTER TABLE public.detection_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own detection reviews"
  ON public.detection_reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own detection reviews"
  ON public.detection_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own detection reviews"
  ON public.detection_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own detection reviews"
  ON public.detection_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_detection_reviews_updated_at
  BEFORE UPDATE ON public.detection_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de thresholds de modelos por tipo de risco
CREATE TABLE public.model_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  risk_type TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'default',
  min_confidence NUMERIC NOT NULL DEFAULT 0.7 CHECK (min_confidence >= 0 AND min_confidence <= 1),
  min_quality NUMERIC NULL CHECK (min_quality IS NULL OR (min_quality >= 0 AND min_quality <= 1)),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, risk_type, model_name)
);

ALTER TABLE public.model_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own model thresholds"
  ON public.model_thresholds FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own model thresholds"
  ON public.model_thresholds FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own model thresholds"
  ON public.model_thresholds FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own model thresholds"
  ON public.model_thresholds FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_model_thresholds_updated_at
  BEFORE UPDATE ON public.model_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
