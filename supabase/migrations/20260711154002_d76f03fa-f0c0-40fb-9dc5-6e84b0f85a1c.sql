-- Performance: index all foreign keys to prevent seq scans on joins and speed up cascade deletes.
CREATE INDEX IF NOT EXISTS idx_recognition_logs_camera_id ON public.recognition_logs (camera_id);
CREATE INDEX IF NOT EXISTS idx_recognition_logs_person_id ON public.recognition_logs (person_id);
CREATE INDEX IF NOT EXISTS idx_plate_detections_camera_id ON public.plate_detections (camera_id);