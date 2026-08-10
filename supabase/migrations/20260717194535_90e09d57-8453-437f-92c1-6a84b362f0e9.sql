-- Etapa 6: preparação para Cold Tier (S3 Glacier)
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restore_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restore_available_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_class TEXT;

-- Índice para o job de arquivamento cold
CREATE INDEX IF NOT EXISTS idx_media_assets_warm_ready_cold
  ON public.media_assets (promoted_at)
  WHERE storage_tier = 'warm' AND legal_hold = false;

COMMENT ON COLUMN public.media_assets.legal_hold IS 'Se true, bloqueia arquivamento cold e deleção (LGPD / retenção legal)';
COMMENT ON COLUMN public.media_assets.archived_at IS 'Timestamp de promoção warm->cold (S3 Glacier)';
COMMENT ON COLUMN public.media_assets.restore_requested_at IS 'Início do restore assíncrono do Glacier';
COMMENT ON COLUMN public.media_assets.restore_available_until IS 'Janela em que o objeto restaurado fica acessível';
COMMENT ON COLUMN public.media_assets.storage_class IS 'Classe efetiva no S3 (GLACIER, DEEP_ARCHIVE, GLACIER_IR)';