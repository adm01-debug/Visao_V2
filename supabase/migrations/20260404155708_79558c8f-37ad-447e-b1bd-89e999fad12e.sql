
-- ===== Remove stale {public} policies on panic_events =====
DROP POLICY IF EXISTS "Users can delete their own panic_events" ON public.panic_events;
DROP POLICY IF EXISTS "Users can insert their own panic_events" ON public.panic_events;
DROP POLICY IF EXISTS "Users can update their own panic_events" ON public.panic_events;
DROP POLICY IF EXISTS "Users can view their own panic_events" ON public.panic_events;

-- ===== Remove stale {public} policies on registered_plates =====
DROP POLICY IF EXISTS "Users can delete their own registered plates" ON public.registered_plates;
DROP POLICY IF EXISTS "Users can insert their own registered plates" ON public.registered_plates;
DROP POLICY IF EXISTS "Users can update their own registered plates" ON public.registered_plates;
DROP POLICY IF EXISTS "Users can view their own registered plates" ON public.registered_plates;

-- ===== Remove stale {public} storage policies =====
DROP POLICY IF EXISTS "Public can view person photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view camera thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload person photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their person photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload camera thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their camera thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own heatmap snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;

-- ===== Recreate avatar policies with {authenticated} =====
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
