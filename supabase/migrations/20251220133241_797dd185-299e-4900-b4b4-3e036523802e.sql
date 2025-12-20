-- Create storage bucket for person photos (face recognition)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'person-photos',
  'person-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage bucket for camera thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'camera-thumbnails',
  'camera-thumbnails',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS Policies for person-photos bucket

-- Anyone can view photos (public bucket)
CREATE POLICY "Public can view person photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'person-photos');

-- Authenticated users can upload their own photos
CREATE POLICY "Users can upload person photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'person-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own photos
CREATE POLICY "Users can update their person photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'person-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own photos
CREATE POLICY "Users can delete their person photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'person-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policies for camera-thumbnails bucket

-- Anyone can view thumbnails (public bucket)
CREATE POLICY "Public can view camera thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'camera-thumbnails');

-- Authenticated users can upload thumbnails
CREATE POLICY "Users can upload camera thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'camera-thumbnails' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own thumbnails
CREATE POLICY "Users can update their camera thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'camera-thumbnails' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their camera thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'camera-thumbnails' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);