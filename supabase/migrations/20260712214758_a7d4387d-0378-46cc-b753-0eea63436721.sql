
-- VEHICLES (usa mesmo trigger de normalização de placas)
DROP TRIGGER IF EXISTS trg_normalize_vehicle_plate ON public.vehicles;
CREATE TRIGGER trg_normalize_vehicle_plate
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.normalize_plate();

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_plate_format CHECK (
    plate ~ '^[A-Z]{3}[0-9]{4}$' OR plate ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$'
  ) NOT VALID,
  ADD CONSTRAINT vehicles_type_valid CHECK (type IN ('whitelist','blacklist','vip','suspect')) NOT VALID;

ALTER TABLE public.vehicles VALIDATE CONSTRAINT vehicles_plate_format;
ALTER TABLE public.vehicles VALIDATE CONSTRAINT vehicles_type_valid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_user_plate
  ON public.vehicles (user_id, plate);

-- ZONE_EVENTS
ALTER TABLE public.zone_events
  ADD CONSTRAINT zone_events_type_not_blank CHECK (length(btrim(event_type)) > 0) NOT VALID,
  ADD CONSTRAINT zone_events_ts_not_future CHECK ("timestamp" <= now() + interval '5 minutes') NOT VALID;

ALTER TABLE public.zone_events VALIDATE CONSTRAINT zone_events_type_not_blank;
ALTER TABLE public.zone_events VALIDATE CONSTRAINT zone_events_ts_not_future;

-- STREAM_RECORDINGS
ALTER TABLE public.stream_recordings
  ADD CONSTRAINT stream_rec_format_valid CHECK (format IS NULL OR format IN ('webm','mp4','mkv')) NOT VALID,
  ADD CONSTRAINT stream_rec_quality_valid CHECK (quality IS NULL OR quality IN ('low','medium','high','ultra')) NOT VALID,
  ADD CONSTRAINT stream_rec_status_valid CHECK (status IN ('recording','completed','failed','processing')) NOT VALID,
  ADD CONSTRAINT stream_rec_size_nonneg CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0) NOT VALID,
  ADD CONSTRAINT stream_rec_duration_nonneg CHECK (duration_seconds IS NULL OR duration_seconds >= 0) NOT VALID,
  ADD CONSTRAINT stream_rec_time_order CHECK (ended_at IS NULL OR ended_at >= started_at) NOT VALID;

ALTER TABLE public.stream_recordings VALIDATE CONSTRAINT stream_rec_format_valid;
ALTER TABLE public.stream_recordings VALIDATE CONSTRAINT stream_rec_quality_valid;
ALTER TABLE public.stream_recordings VALIDATE CONSTRAINT stream_rec_status_valid;
ALTER TABLE public.stream_recordings VALIDATE CONSTRAINT stream_rec_size_nonneg;
ALTER TABLE public.stream_recordings VALIDATE CONSTRAINT stream_rec_duration_nonneg;
ALTER TABLE public.stream_recordings VALIDATE CONSTRAINT stream_rec_time_order;

-- VIDEO_CLIPS
ALTER TABLE public.video_clips
  ADD CONSTRAINT clips_status_valid CHECK (status IN ('recording','completed','failed','processing')) NOT VALID,
  ADD CONSTRAINT clips_duration_nonneg CHECK (duration IS NULL OR duration >= 0) NOT VALID,
  ADD CONSTRAINT clips_time_order CHECK (end_time IS NULL OR end_time >= start_time) NOT VALID;

ALTER TABLE public.video_clips VALIDATE CONSTRAINT clips_status_valid;
ALTER TABLE public.video_clips VALIDATE CONSTRAINT clips_duration_nonneg;
ALTER TABLE public.video_clips VALIDATE CONSTRAINT clips_time_order;
