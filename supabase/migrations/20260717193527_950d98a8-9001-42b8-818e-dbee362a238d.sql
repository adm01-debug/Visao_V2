-- ============================================================
-- Etapa 1: Metadados de Mídia (Cloud Storage Architecture)
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.media_type AS ENUM ('snapshot', 'clip', 'continuous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.storage_tier AS ENUM ('hot', 'warm', 'cold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.retention_class AS ENUM ('standard', 'extended', 'forensic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  type public.media_type NOT NULL,
  storage_tier public.storage_tier NOT NULL DEFAULT 'hot',
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  duration_seconds NUMERIC(10,3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  checksum_sha256 TEXT NOT NULL,
  retention_class public.retention_class NOT NULL DEFAULT 'standard',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  promoted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_unique_object UNIQUE (bucket, object_key),
  CONSTRAINT media_assets_checksum_shape CHECK (checksum_sha256 ~ '^[a-f0-9]{64}$')
);

-- GRANTs (obrigatório em toda tabela public)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

-- RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own media"
  ON public.media_assets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own media"
  ON public.media_assets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own media"
  ON public.media_assets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own media"
  ON public.media_assets FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_media_assets_camera_captured
  ON public.media_assets (camera_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_user_captured
  ON public.media_assets (user_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_tier_expires
  ON public.media_assets (storage_tier, expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_type
  ON public.media_assets (type, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_checksum
  ON public.media_assets (checksum_sha256);

-- Função de retenção (calcula expires_at por classe)
CREATE OR REPLACE FUNCTION public.calculate_media_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retention_days INTEGER;
BEGIN
  IF NEW.expires_at IS NULL THEN
    retention_days := CASE NEW.retention_class
      WHEN 'standard' THEN 30
      WHEN 'extended' THEN 180
      WHEN 'forensic' THEN 2555  -- 7 anos (LGPD/forense)
      ELSE 30
    END;
    NEW.expires_at := NEW.captured_at + (retention_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_assets_expiration ON public.media_assets;
CREATE TRIGGER trg_media_assets_expiration
  BEFORE INSERT OR UPDATE OF retention_class, captured_at ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.calculate_media_expiration();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_media_assets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_media_assets_updated_at();

-- Comentários (documentação inline)
COMMENT ON TABLE public.media_assets IS 'Metadados de mídias das câmeras armazenadas em nuvem (tiered: hot/warm/cold)';
COMMENT ON COLUMN public.media_assets.storage_tier IS 'Camada atual: hot (Supabase 7d), warm (R2 30d), cold (Glacier 1y+)';
COMMENT ON COLUMN public.media_assets.checksum_sha256 IS 'SHA-256 para integridade e idempotência de upload';
COMMENT ON COLUMN public.media_assets.retention_class IS 'standard=30d, extended=180d, forensic=7 anos (LGPD)';