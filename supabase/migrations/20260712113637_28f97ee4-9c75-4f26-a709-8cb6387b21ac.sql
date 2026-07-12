
-- Partições futuras: ago/set/out 2026 para plate_detections e recognition_logs

-- plate_detections
CREATE TABLE IF NOT EXISTS public.plate_detections_m2026_08 PARTITION OF public.plate_detections
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS public.plate_detections_m2026_09 PARTITION OF public.plate_detections
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS public.plate_detections_m2026_10 PARTITION OF public.plate_detections
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_detections_m2026_08 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_detections_m2026_09 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_detections_m2026_10 TO authenticated;
GRANT ALL ON public.plate_detections_m2026_08 TO service_role;
GRANT ALL ON public.plate_detections_m2026_09 TO service_role;
GRANT ALL ON public.plate_detections_m2026_10 TO service_role;

ALTER TABLE public.plate_detections_m2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_detections_m2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_detections_m2026_10 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_rows" ON public.plate_detections_m2026_08 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.plate_detections_m2026_09 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.plate_detections_m2026_10 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recognition_logs
CREATE TABLE IF NOT EXISTS public.recognition_logs_m2026_08 PARTITION OF public.recognition_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS public.recognition_logs_m2026_09 PARTITION OF public.recognition_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS public.recognition_logs_m2026_10 PARTITION OF public.recognition_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recognition_logs_m2026_08 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recognition_logs_m2026_09 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recognition_logs_m2026_10 TO authenticated;
GRANT ALL ON public.recognition_logs_m2026_08 TO service_role;
GRANT ALL ON public.recognition_logs_m2026_09 TO service_role;
GRANT ALL ON public.recognition_logs_m2026_10 TO service_role;

ALTER TABLE public.recognition_logs_m2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_logs_m2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_logs_m2026_10 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_rows" ON public.recognition_logs_m2026_08 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.recognition_logs_m2026_09 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.recognition_logs_m2026_10 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
