
-- Onda Shinobi 3 — Monitor Groups / Saved Layouts

CREATE TABLE public.monitor_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  layout TEXT NOT NULL CHECK (layout IN ('1x1','2x2','3x3','4x4','1+5','2+8')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_monitor_groups_user ON public.monitor_groups(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_groups TO authenticated;
GRANT ALL ON public.monitor_groups TO service_role;
ALTER TABLE public.monitor_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mg_select_own" ON public.monitor_groups FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mg_insert_own" ON public.monitor_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mg_update_own" ON public.monitor_groups FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mg_delete_own" ON public.monitor_groups FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.monitor_group_cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.monitor_groups(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_index INT NOT NULL CHECK (slot_index BETWEEN 0 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, slot_index),
  UNIQUE (group_id, camera_id)
);
CREATE INDEX idx_mgc_group ON public.monitor_group_cameras(group_id);
CREATE INDEX idx_mgc_user ON public.monitor_group_cameras(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_group_cameras TO authenticated;
GRANT ALL ON public.monitor_group_cameras TO service_role;
ALTER TABLE public.monitor_group_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mgc_select_own" ON public.monitor_group_cameras FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mgc_insert_own" ON public.monitor_group_cameras FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mgc_update_own" ON public.monitor_group_cameras FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mgc_delete_own" ON public.monitor_group_cameras FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger updated_at (função pública já existe: public.update_updated_at_column)
CREATE TRIGGER trg_mg_updated_at BEFORE UPDATE ON public.monitor_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce max 32 slots por grupo
CREATE OR REPLACE FUNCTION public.enforce_monitor_group_slot_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM public.monitor_group_cameras WHERE group_id = NEW.group_id;
  IF cnt >= 32 THEN
    RAISE EXCEPTION 'Grupo já contém o máximo de 32 câmeras';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_mgc_slot_limit BEFORE INSERT ON public.monitor_group_cameras
  FOR EACH ROW EXECUTE FUNCTION public.enforce_monitor_group_slot_limit();
