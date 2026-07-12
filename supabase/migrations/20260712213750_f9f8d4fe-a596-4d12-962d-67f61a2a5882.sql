
-- CAMERAS
ALTER TABLE public.cameras
  ADD CONSTRAINT cameras_name_not_blank CHECK (length(btrim(name)) > 0) NOT VALID,
  ADD CONSTRAINT cameras_location_not_blank CHECK (length(btrim(location)) > 0) NOT VALID,
  ADD CONSTRAINT cameras_lat_range CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)) NOT VALID,
  ADD CONSTRAINT cameras_lon_range CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)) NOT VALID,
  ADD CONSTRAINT cameras_counts_nonneg CHECK (
    (detected_people IS NULL OR detected_people >= 0) AND
    (alerts_count IS NULL OR alerts_count >= 0)
  ) NOT VALID;

ALTER TABLE public.cameras VALIDATE CONSTRAINT cameras_name_not_blank;
ALTER TABLE public.cameras VALIDATE CONSTRAINT cameras_location_not_blank;
ALTER TABLE public.cameras VALIDATE CONSTRAINT cameras_lat_range;
ALTER TABLE public.cameras VALIDATE CONSTRAINT cameras_lon_range;
ALTER TABLE public.cameras VALIDATE CONSTRAINT cameras_counts_nonneg;

-- PANIC EVENTS
ALTER TABLE public.panic_events
  ADD CONSTRAINT panic_lat_range CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)) NOT VALID,
  ADD CONSTRAINT panic_lon_range CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)) NOT VALID,
  ADD CONSTRAINT panic_resolution_consistency CHECK (
    (resolved = true) OR (resolved = false AND resolved_at IS NULL AND resolved_by IS NULL)
  ) NOT VALID;

ALTER TABLE public.panic_events VALIDATE CONSTRAINT panic_lat_range;
ALTER TABLE public.panic_events VALIDATE CONSTRAINT panic_lon_range;
ALTER TABLE public.panic_events VALIDATE CONSTRAINT panic_resolution_consistency;
