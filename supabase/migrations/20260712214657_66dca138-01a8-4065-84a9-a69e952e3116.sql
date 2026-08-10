
-- RECORDING_CONFIGS
ALTER TABLE public.recording_configs
  ADD CONSTRAINT rec_quality_valid CHECK (quality IN ('low','medium','high','ultra')) NOT VALID,
  ADD CONSTRAINT rec_format_valid CHECK (format IN ('webm','mp4','mkv')) NOT VALID,
  ADD CONSTRAINT rec_duration_range CHECK (max_duration_seconds BETWEEN 10 AND 86400) NOT VALID,
  ADD CONSTRAINT rec_filesize_range CHECK (max_file_size_mb BETWEEN 1 AND 10240) NOT VALID,
  ADD CONSTRAINT rec_retention_range CHECK (retention_days BETWEEN 1 AND 3650) NOT VALID,
  ADD CONSTRAINT rec_prebuffer_range CHECK (pre_buffer_seconds BETWEEN 0 AND 300) NOT VALID,
  ADD CONSTRAINT rec_postbuffer_range CHECK (post_buffer_seconds BETWEEN 0 AND 300) NOT VALID;

ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_quality_valid;
ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_format_valid;
ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_duration_range;
ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_filesize_range;
ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_retention_range;
ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_prebuffer_range;
ALTER TABLE public.recording_configs VALIDATE CONSTRAINT rec_postbuffer_range;

-- FACE_RECOGNITION_CONFIGS
ALTER TABLE public.face_recognition_configs
  ADD CONSTRAINT face_match_threshold_range CHECK (match_threshold BETWEEN 0 AND 1) NOT VALID,
  ADD CONSTRAINT face_quality_range CHECK (min_face_quality BETWEEN 0 AND 1) NOT VALID,
  ADD CONSTRAINT face_size_range CHECK (min_face_size BETWEEN 20 AND 2000) NOT VALID,
  ADD CONSTRAINT face_max_faces_range CHECK (max_faces_per_frame BETWEEN 1 AND 100) NOT VALID,
  ADD CONSTRAINT face_cooldown_range CHECK (alert_cooldown BETWEEN 0 AND 3600) NOT VALID;

ALTER TABLE public.face_recognition_configs VALIDATE CONSTRAINT face_match_threshold_range;
ALTER TABLE public.face_recognition_configs VALIDATE CONSTRAINT face_quality_range;
ALTER TABLE public.face_recognition_configs VALIDATE CONSTRAINT face_size_range;
ALTER TABLE public.face_recognition_configs VALIDATE CONSTRAINT face_max_faces_range;
ALTER TABLE public.face_recognition_configs VALIDATE CONSTRAINT face_cooldown_range;

-- ARM_DISARM_STATES
ALTER TABLE public.arm_disarm_states
  ADD CONSTRAINT arm_time_format CHECK (
    (schedule_start_time IS NULL OR schedule_start_time ~ '^[0-2][0-9]:[0-5][0-9]$') AND
    (schedule_end_time IS NULL OR schedule_end_time ~ '^[0-2][0-9]:[0-5][0-9]$')
  ) NOT VALID,
  ADD CONSTRAINT arm_days_valid CHECK (public.array_days_valid(schedule_days)) NOT VALID;

ALTER TABLE public.arm_disarm_states VALIDATE CONSTRAINT arm_time_format;
ALTER TABLE public.arm_disarm_states VALIDATE CONSTRAINT arm_days_valid;
