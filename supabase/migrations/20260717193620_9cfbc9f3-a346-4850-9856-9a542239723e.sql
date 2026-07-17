-- Etapa 2: RLS nos buckets de mídia (path: {user_id}/{camera_id}/...)
-- Padrão: primeiro segmento do path === auth.uid()

DO $$
DECLARE
  bucket_name TEXT;
  buckets TEXT[] := ARRAY['camera-snapshots', 'camera-clips', 'camera-continuous'];
BEGIN
  FOREACH bucket_name IN ARRAY buckets LOOP
    -- SELECT
    EXECUTE format($p$
      DROP POLICY IF EXISTS "media_%s_select_own" ON storage.objects;
      CREATE POLICY "media_%s_select_own" ON storage.objects
        FOR SELECT TO authenticated
        USING (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.has_role(auth.uid(), 'admin')
          )
        );
    $p$, bucket_name, bucket_name, bucket_name);

    -- INSERT
    EXECUTE format($p$
      DROP POLICY IF EXISTS "media_%s_insert_own" ON storage.objects;
      CREATE POLICY "media_%s_insert_own" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = %L
          AND (storage.foldername(name))[1] = auth.uid()::text
        );
    $p$, bucket_name, bucket_name, bucket_name);

    -- UPDATE
    EXECUTE format($p$
      DROP POLICY IF EXISTS "media_%s_update_own" ON storage.objects;
      CREATE POLICY "media_%s_update_own" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.has_role(auth.uid(), 'admin')
          )
        );
    $p$, bucket_name, bucket_name, bucket_name);

    -- DELETE
    EXECUTE format($p$
      DROP POLICY IF EXISTS "media_%s_delete_own" ON storage.objects;
      CREATE POLICY "media_%s_delete_own" ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = %L
          AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.has_role(auth.uid(), 'admin')
          )
        );
    $p$, bucket_name, bucket_name, bucket_name);
  END LOOP;
END $$;