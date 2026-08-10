-- =============================================================
-- Onda 161 — E-Map: plantas baixas e posicionamento de câmeras
-- =============================================================

CREATE TABLE public.site_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  image_path text NOT NULL,
  image_width integer NOT NULL,
  image_height integer NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_plans_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT site_plans_image_path_not_blank CHECK (btrim(image_path) <> ''),
  -- Dimensões reais da imagem: sem elas o encaixe "contain" não tem como
  -- preservar a proporção e os marcadores escorregam para cima da tarja.
  CONSTRAINT site_plans_width_sane CHECK (image_width BETWEEN 16 AND 20000),
  CONSTRAINT site_plans_height_sane CHECK (image_height BETWEEN 16 AND 20000)
);

CREATE INDEX site_plans_user_idx ON public.site_plans (user_id, created_at DESC);

-- Apenas uma planta padrão por pessoa.
CREATE UNIQUE INDEX site_plans_one_default_per_user
  ON public.site_plans (user_id)
  WHERE is_default;

REVOKE ALL ON public.site_plans FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_plans TO authenticated;
GRANT ALL ON public.site_plans TO service_role;

ALTER TABLE public.site_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_plans_select_own" ON public.site_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "site_plans_insert_own" ON public.site_plans
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "site_plans_update_own" ON public.site_plans
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "site_plans_delete_own" ON public.site_plans
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER site_plans_set_updated_at
  BEFORE UPDATE ON public.site_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------
-- Posicionamento das câmeras na planta
-- -------------------------------------------------------------

CREATE TABLE public.site_plan_placements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.site_plans(id) ON DELETE CASCADE,
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  -- Coordenada NORMALIZADA em relação à imagem da planta. Guardar pixel aqui
  -- amarraria a posição ao tamanho de tela de quem cadastrou.
  x numeric(9,8) NOT NULL,
  y numeric(9,8) NOT NULL,
  heading_deg numeric(6,2) NOT NULL DEFAULT 0,
  fov_deg numeric(6,2) NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_plan_placements_x_range CHECK (x >= 0 AND x <= 1),
  CONSTRAINT site_plan_placements_y_range CHECK (y >= 0 AND y <= 1),
  CONSTRAINT site_plan_placements_heading_range CHECK (heading_deg >= 0 AND heading_deg < 360),
  CONSTRAINT site_plan_placements_fov_range CHECK (fov_deg >= 0 AND fov_deg <= 360),
  CONSTRAINT site_plan_placements_unique_camera UNIQUE (plan_id, camera_id)
);

CREATE INDEX site_plan_placements_plan_idx ON public.site_plan_placements (plan_id);
CREATE INDEX site_plan_placements_camera_idx ON public.site_plan_placements (camera_id);

REVOKE ALL ON public.site_plan_placements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_plan_placements TO authenticated;
GRANT ALL ON public.site_plan_placements TO service_role;

ALTER TABLE public.site_plan_placements ENABLE ROW LEVEL SECURITY;

-- A dona da planta é a mesma dona da câmera: sem esta checagem, alguém poderia
-- fixar na própria planta uma câmera que não lhe pertence e, pela junção,
-- inferir quais identificadores existem no sistema.
CREATE OR REPLACE FUNCTION public.owns_plan_and_camera(_plan_id uuid, _camera_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.site_plans p
    JOIN public.cameras c ON c.id = _camera_id
    WHERE p.id = _plan_id
      AND p.user_id = auth.uid()
      AND c.user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.owns_plan_and_camera(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_plan_and_camera(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.owns_plan_and_camera(uuid, uuid) TO authenticated;

CREATE POLICY "site_plan_placements_select_own" ON public.site_plan_placements
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "site_plan_placements_insert_own" ON public.site_plan_placements
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.owns_plan_and_camera(plan_id, camera_id));
CREATE POLICY "site_plan_placements_update_own" ON public.site_plan_placements
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.owns_plan_and_camera(plan_id, camera_id));
CREATE POLICY "site_plan_placements_delete_own" ON public.site_plan_placements
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER site_plan_placements_set_updated_at
  BEFORE UPDATE ON public.site_plan_placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------
-- Armazenamento privado das imagens de planta (bucket já criado)
-- -------------------------------------------------------------

CREATE POLICY "site_plans_storage_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'site-plans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "site_plans_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-plans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "site_plans_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-plans' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'site-plans' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "site_plans_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-plans' AND (storage.foldername(name))[1] = auth.uid()::text);