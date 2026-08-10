
-- ===== Fix user_roles UPDATE policy: add WITH CHECK =====
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== Add UPDATE policies for private storage buckets =====
CREATE POLICY "person_photos_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'person-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "recordings_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "heatmap_snapshots_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'heatmap-snapshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "camera_thumbnails_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'camera-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
