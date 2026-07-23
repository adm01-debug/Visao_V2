ALTER TABLE public.camera_ptz_config
  ADD COLUMN IF NOT EXISTS ptz_backends TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ptz_backends_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (ptz_backends_mode IN ('manual', 'auto-multi'));

COMMENT ON COLUMN public.camera_ptz_config.ptz_backends IS
  'Lista de protocolos PTZ nativos a serem tentados (ex.: PELCOD, Hikvision, DaHua-SD). Pré-preenchida por perfis OEM como xiongmai-nbd80x.';

COMMENT ON COLUMN public.camera_ptz_config.ptz_backends_mode IS
  'auto-multi = tenta todos os backends listados sem perguntar marca do dome; manual = usa apenas o backend explicitamente escolhido.';