
-- Wave NVR-Foundation 1: tabela nvrs + vínculo com cameras + RPC transacional

CREATE TABLE public.nvrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  location text CHECK (location IS NULL OR length(location) <= 120),
  brand text NOT NULL DEFAULT 'usecam' CHECK (brand IN ('usecam','hikvision','dahua','intelbras','generica')),
  host text NOT NULL CHECK (length(host) BETWEEN 3 AND 253),
  rtsp_port int NOT NULL DEFAULT 554 CHECK (rtsp_port BETWEEN 1 AND 65535),
  channel_count int NOT NULL DEFAULT 1 CHECK (channel_count BETWEEN 1 AND 64),
  template_id text NOT NULL CHECK (length(template_id) BETWEEN 1 AND 80),
  agent_id uuid REFERENCES public.local_agents(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nvrs TO authenticated;
GRANT ALL ON public.nvrs TO service_role;

ALTER TABLE public.nvrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nvrs_select_own" ON public.nvrs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "nvrs_insert_own" ON public.nvrs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nvrs_update_own" ON public.nvrs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nvrs_delete_own" ON public.nvrs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_nvrs_updated_at BEFORE UPDATE ON public.nvrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX nvrs_user_id_idx ON public.nvrs(user_id);
CREATE INDEX nvrs_agent_id_idx ON public.nvrs(agent_id) WHERE agent_id IS NOT NULL;

-- Vincular câmeras a um NVR (opcional)
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS nvr_id uuid REFERENCES public.nvrs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS channel_number int CHECK (channel_number IS NULL OR channel_number BETWEEN 1 AND 64);

CREATE INDEX IF NOT EXISTS cameras_nvr_id_idx ON public.cameras(nvr_id) WHERE nvr_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cameras_nvr_channel_unique
  ON public.cameras(nvr_id, channel_number) WHERE nvr_id IS NOT NULL;

-- RPC transacional: cria NVR + N canais em uma única operação.
-- p_channel_urls: jsonb array [{channel:int, url:text, substream:text|null}, ...]
CREATE OR REPLACE FUNCTION public.create_nvr_with_channels(
  p_name text,
  p_location text,
  p_brand text,
  p_host text,
  p_port int,
  p_template_id text,
  p_channels int,
  p_channel_urls jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nvr_id uuid;
  v_ch jsonb;
  v_ch_num int;
  v_url text;
  v_sub text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_channel_urls) <> 'array' THEN
    RAISE EXCEPTION 'p_channel_urls must be jsonb array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_channel_urls) = 0 THEN
    RAISE EXCEPTION 'at least one channel required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_channel_urls) > 64 THEN
    RAISE EXCEPTION 'too many channels (max 64)' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.nvrs (user_id, name, location, brand, host, rtsp_port, channel_count, template_id)
  VALUES (v_uid, trim(p_name), NULLIF(trim(coalesce(p_location,'')),''), p_brand, p_host, p_port, p_channels, p_template_id)
  RETURNING id INTO v_nvr_id;

  FOR v_ch IN SELECT jsonb_array_elements(p_channel_urls)
  LOOP
    v_ch_num := (v_ch->>'channel')::int;
    v_url    := v_ch->>'url';
    v_sub    := NULLIF(v_ch->>'substream', '');
    IF v_ch_num IS NULL OR v_ch_num < 1 OR v_ch_num > 64 THEN
      RAISE EXCEPTION 'invalid channel number: %', v_ch_num USING ERRCODE = '22023';
    END IF;
    IF v_url IS NULL OR length(v_url) < 8 THEN
      RAISE EXCEPTION 'invalid url for channel %', v_ch_num USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.cameras (
      user_id, name, location, status, nvr_id, channel_number,
      stream_url, substream_url, substream_enabled
    ) VALUES (
      v_uid,
      trim(p_name) || ' — Canal ' || v_ch_num,
      NULLIF(trim(coalesce(p_location,'')),''),
      'offline',
      v_nvr_id,
      v_ch_num,
      v_url,
      v_sub,
      v_sub IS NOT NULL
    );
  END LOOP;

  RETURN v_nvr_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_nvr_with_channels(text,text,text,text,int,text,int,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_nvr_with_channels(text,text,text,text,int,text,int,jsonb) TO authenticated, service_role;
