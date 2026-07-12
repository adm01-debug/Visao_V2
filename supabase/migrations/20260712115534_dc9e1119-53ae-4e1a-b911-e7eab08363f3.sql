
-- Partições futuras: nov/dez 2026 + jan 2027 para plate_detections e recognition_logs

-- plate_detections
CREATE TABLE IF NOT EXISTS public.plate_detections_m2026_11 PARTITION OF public.plate_detections
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS public.plate_detections_m2026_12 PARTITION OF public.plate_detections
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS public.plate_detections_m2027_01 PARTITION OF public.plate_detections
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_detections_m2026_11 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_detections_m2026_12 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_detections_m2027_01 TO authenticated;
GRANT ALL ON public.plate_detections_m2026_11 TO service_role;
GRANT ALL ON public.plate_detections_m2026_12 TO service_role;
GRANT ALL ON public.plate_detections_m2027_01 TO service_role;

ALTER TABLE public.plate_detections_m2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_detections_m2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plate_detections_m2027_01 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_rows" ON public.plate_detections_m2026_11 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.plate_detections_m2026_12 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.plate_detections_m2027_01 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recognition_logs
CREATE TABLE IF NOT EXISTS public.recognition_logs_m2026_11 PARTITION OF public.recognition_logs
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS public.recognition_logs_m2026_12 PARTITION OF public.recognition_logs
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS public.recognition_logs_m2027_01 PARTITION OF public.recognition_logs
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recognition_logs_m2026_11 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recognition_logs_m2026_12 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recognition_logs_m2027_01 TO authenticated;
GRANT ALL ON public.recognition_logs_m2026_11 TO service_role;
GRANT ALL ON public.recognition_logs_m2026_12 TO service_role;
GRANT ALL ON public.recognition_logs_m2027_01 TO service_role;

ALTER TABLE public.recognition_logs_m2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_logs_m2026_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recognition_logs_m2027_01 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_rows" ON public.recognition_logs_m2026_11 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.recognition_logs_m2026_12 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rows" ON public.recognition_logs_m2027_01 FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
