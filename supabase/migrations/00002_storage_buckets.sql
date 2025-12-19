-- ============================================
-- VISÃO - Sistema de Vigilância Inteligente
-- Configuração de Storage Buckets
-- ============================================

-- ============================================
-- 1. BUCKET: clips (Vídeos gravados)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clips',
  'clips',
  true,
  104857600, -- 100MB max
  ARRAY['video/mp4', 'video/webm', 'image/gif', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'image/gif', 'image/jpeg', 'image/png'];

-- Políticas para clips
DROP POLICY IF EXISTS "Public read access for clips" ON storage.objects;
CREATE POLICY "Public read access for clips"
ON storage.objects FOR SELECT
USING (bucket_id = 'clips');

DROP POLICY IF EXISTS "Authenticated upload for clips" ON storage.objects;
CREATE POLICY "Authenticated upload for clips"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'clips');

DROP POLICY IF EXISTS "Authenticated update for clips" ON storage.objects;
CREATE POLICY "Authenticated update for clips"
ON storage.objects FOR UPDATE
USING (bucket_id = 'clips');

DROP POLICY IF EXISTS "Authenticated delete for clips" ON storage.objects;
CREATE POLICY "Authenticated delete for clips"
ON storage.objects FOR DELETE
USING (bucket_id = 'clips');

-- ============================================
-- 2. BUCKET: face-photos (Fotos de pessoas)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'face-photos',
  'face-photos',
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Políticas para face-photos
DROP POLICY IF EXISTS "Public read access for face-photos" ON storage.objects;
CREATE POLICY "Public read access for face-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-photos');

DROP POLICY IF EXISTS "Authenticated upload for face-photos" ON storage.objects;
CREATE POLICY "Authenticated upload for face-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'face-photos');

DROP POLICY IF EXISTS "Authenticated update for face-photos" ON storage.objects;
CREATE POLICY "Authenticated update for face-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'face-photos');

DROP POLICY IF EXISTS "Authenticated delete for face-photos" ON storage.objects;
CREATE POLICY "Authenticated delete for face-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'face-photos');

-- ============================================
-- 3. BUCKET: snapshots (Capturas de tela)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'snapshots',
  'snapshots',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Políticas para snapshots
DROP POLICY IF EXISTS "Public read access for snapshots" ON storage.objects;
CREATE POLICY "Public read access for snapshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'snapshots');

DROP POLICY IF EXISTS "Authenticated upload for snapshots" ON storage.objects;
CREATE POLICY "Authenticated upload for snapshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'snapshots');

DROP POLICY IF EXISTS "Authenticated delete for snapshots" ON storage.objects;
CREATE POLICY "Authenticated delete for snapshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'snapshots');

-- ============================================
-- 4. BUCKET: analysis-results (Resultados de análise)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analysis-results',
  'analysis-results',
  false, -- privado
  20971520, -- 20MB max
  ARRAY['application/json', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/json', 'image/jpeg', 'image/png'];

-- Políticas para analysis-results (apenas autenticados)
DROP POLICY IF EXISTS "Authenticated access for analysis-results" ON storage.objects;
CREATE POLICY "Authenticated access for analysis-results"
ON storage.objects FOR ALL
USING (bucket_id = 'analysis-results' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'analysis-results' AND auth.role() = 'authenticated');

-- ============================================
-- 5. VERIFICAÇÃO
-- ============================================

SELECT 
  id as bucket_name,
  public,
  pg_size_pretty(file_size_limit::bigint) as max_size,
  array_to_string(allowed_mime_types, ', ') as mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('clips', 'face-photos', 'snapshots', 'analysis-results')
ORDER BY id;
