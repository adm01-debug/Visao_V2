-- =========================================================
-- Wave 9: InsightFace integration schema
-- =========================================================

-- 1) face_embeddings: 512D ArcFace embeddings, versioned per model
CREATE TABLE public.face_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.registered_persons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'arcface_r100_v1',
  embedding REAL[] NOT NULL,
  embedding_dim INTEGER NOT NULL DEFAULT 512,
  quality_score REAL,
  source_photo_url TEXT,
  pose_yaw REAL,
  pose_pitch REAL,
  pose_roll REAL,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT face_embeddings_dim_check CHECK (embedding_dim IN (128, 256, 512)),
  CONSTRAINT face_embeddings_embedding_len CHECK (array_length(embedding, 1) = embedding_dim)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_embeddings TO authenticated;
GRANT ALL ON public.face_embeddings TO service_role;

ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their embeddings"
  ON public.face_embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Owners can insert embeddings"
  ON public.face_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update embeddings"
  ON public.face_embeddings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete embeddings"
  ON public.face_embeddings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_face_embeddings_person ON public.face_embeddings(person_id);
CREATE INDEX idx_face_embeddings_user ON public.face_embeddings(user_id);
CREATE INDEX idx_face_embeddings_model ON public.face_embeddings(model_version);
CREATE INDEX idx_face_embeddings_hash ON public.face_embeddings(source_hash) WHERE source_hash IS NOT NULL;

CREATE TRIGGER trg_face_embeddings_updated_at
  BEFORE UPDATE ON public.face_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) registered_persons: versioning fields
ALTER TABLE public.registered_persons
  ADD COLUMN IF NOT EXISTS encoding_version TEXT NOT NULL DEFAULT 'face-api-128',
  ADD COLUMN IF NOT EXISTS encoding_migrated_at TIMESTAMPTZ;

-- 3) recognition_logs: enrich with liveness, analysis, model version
ALTER TABLE public.recognition_logs
  ADD COLUMN IF NOT EXISTS liveness_score REAL,
  ADD COLUMN IF NOT EXISTS spoof_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_estimated INTEGER,
  ADD COLUMN IF NOT EXISTS gender_estimated TEXT,
  ADD COLUMN IF NOT EXISTS pose_yaw REAL,
  ADD COLUMN IF NOT EXISTS pose_pitch REAL,
  ADD COLUMN IF NOT EXISTS pose_roll REAL,
  ADD COLUMN IF NOT EXISTS model_version TEXT;

-- 4) face_recognition_configs: provider + liveness + arcface threshold
ALTER TABLE public.face_recognition_configs
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'insightface',
  ADD COLUMN IF NOT EXISTS liveness_threshold REAL NOT NULL DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS liveness_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arcface_threshold REAL NOT NULL DEFAULT 0.5,
  ADD CONSTRAINT face_recognition_configs_provider_check
    CHECK (provider IN ('insightface', 'face-api'));