-- 1. Preparar transição: Remover tabelas antigas (vazias)
DROP TABLE IF EXISTS public.plate_detections CASCADE;
DROP TABLE IF EXISTS public.recognition_logs CASCADE;

-- 2. Criar recognition_logs como particionada
CREATE TABLE public.recognition_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
    person_id UUID REFERENCES public.registered_persons(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    confidence NUMERIC,
    recognized BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 3. Criar plate_detections como particionada
CREATE TABLE public.plate_detections (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    plate TEXT NOT NULL,
    confidence NUMERIC NOT NULL DEFAULT 0.95,
    camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL,
    camera_name TEXT NOT NULL,
    image_url TEXT,
    vehicle_type TEXT DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'unknown',
    direction TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 4. Criar partições iniciais (Maio 2026 - Agosto 2026)
CREATE TABLE public.recognition_logs_y2025_y2026_pre PARTITION OF public.recognition_logs
    FOR VALUES FROM ('2025-01-01') TO ('2026-05-01');
CREATE TABLE public.recognition_logs_m2026_05 PARTITION OF public.recognition_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.recognition_logs_m2026_06 PARTITION OF public.recognition_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.recognition_logs_m2026_07 PARTITION OF public.recognition_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE public.plate_detections_y2025_y2026_pre PARTITION OF public.plate_detections
    FOR VALUES FROM ('2025-01-01') TO ('2026-05-01');
CREATE TABLE public.plate_detections_m2026_05 PARTITION OF public.plate_detections
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.plate_detections_m2026_06 PARTITION OF public.plate_detections
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.plate_detections_m2026_07 PARTITION OF public.plate_detections
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- 5. Re-habilitar RLS e Políticas
ALTER TABLE public.recognition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recognition logs" ON public.recognition_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recognition logs" ON public.recognition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recognition logs" ON public.recognition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recognition logs" ON public.recognition_logs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own plate detections" ON public.plate_detections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plate detections" ON public.plate_detections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plate detections" ON public.plate_detections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plate detections" ON public.plate_detections FOR DELETE USING (auth.uid() = user_id);

-- 6. Adicionar Índices
CREATE INDEX idx_recognition_logs_user_timestamp ON public.recognition_logs (user_id, timestamp DESC);
CREATE INDEX idx_plate_detections_user_plate ON public.plate_detections (user_id, plate);
CREATE INDEX idx_plate_detections_timestamp ON public.plate_detections (timestamp DESC);
