-- Onda 188 — Visualizações favoritas: acesso rápido + integridade do arranjo salvo.

-- 1) Marcação de uso (para ordenar a barra de favoritos por uso recente).
ALTER TABLE public.monitor_groups
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_monitor_groups_user_last_used
  ON public.monitor_groups (user_id, last_used_at DESC NULLS LAST);

-- 2) Teto de favoritos por usuário (24) — barra de acesso rápido não vira lista infinita.
CREATE OR REPLACE FUNCTION public.enforce_monitor_group_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.monitor_groups WHERE user_id = NEW.user_id;
  IF cnt >= 24 THEN
    RAISE EXCEPTION 'Limite de 24 visualizações favoritas por usuário atingido';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mg_quota ON public.monitor_groups;
CREATE TRIGGER trg_mg_quota
  BEFORE INSERT ON public.monitor_groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_monitor_group_quota();

-- 3) Correção do limite de slots: o gatilho só cobria INSERT, então um UPDATE de
--    group_id podia estourar o teto de 32. Passa a cobrir UPDATE de group_id
--    sem contar a própria linha.
CREATE OR REPLACE FUNCTION public.enforce_monitor_group_slot_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cnt INT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.group_id = OLD.group_id THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO cnt
    FROM public.monitor_group_cameras
   WHERE group_id = NEW.group_id
     AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF cnt >= 32 THEN
    RAISE EXCEPTION 'Grupo já contém o máximo de 32 câmeras';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mgc_slot_limit ON public.monitor_group_cameras;
CREATE TRIGGER trg_mgc_slot_limit
  BEFORE INSERT OR UPDATE ON public.monitor_group_cameras
  FOR EACH ROW EXECUTE FUNCTION public.enforce_monitor_group_slot_limit();

-- 4) Um slot só pode pertencer a um grupo do próprio dono da linha.
--    Sem isso, a política de RLS permitia gravar em grupo de terceiro (id adivinhado).
CREATE OR REPLACE FUNCTION public.enforce_monitor_group_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE owner uuid;
BEGIN
  SELECT user_id INTO owner FROM public.monitor_groups WHERE id = NEW.group_id;
  IF owner IS NULL OR owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Slot não pertence ao dono do grupo de monitoramento';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mgc_ownership ON public.monitor_group_cameras;
CREATE TRIGGER trg_mgc_ownership
  BEFORE INSERT OR UPDATE ON public.monitor_group_cameras
  FOR EACH ROW EXECUTE FUNCTION public.enforce_monitor_group_ownership();

REVOKE ALL ON FUNCTION public.enforce_monitor_group_quota() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_monitor_group_ownership() FROM anon, authenticated;