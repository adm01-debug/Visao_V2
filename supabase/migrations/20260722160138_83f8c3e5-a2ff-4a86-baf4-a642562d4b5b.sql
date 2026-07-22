ALTER TABLE public.camera_ptz_config
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{"pan":{"min":-1,"max":1},"tilt":{"min":-1,"max":1},"zoom":{"min":0,"max":1}}'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_completed_at timestamptz;

COMMENT ON COLUMN public.camera_ptz_config.limits IS
  'Limites operacionais PTZ definidos no wizard assistido. Estrutura: {pan:{min,max}, tilt:{min,max}, zoom:{min,max}} em -1..1.';
COMMENT ON COLUMN public.camera_ptz_config.setup_completed_at IS
  'Marca quando o wizard de configuração assistida foi concluído.';