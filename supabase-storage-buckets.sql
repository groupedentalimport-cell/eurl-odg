-- ============================================================
-- supabase-storage-buckets.sql
-- Crée les 2 buckets Supabase Storage pour les uploads admin:
--   - blog-images     (images des articles blog)
--   - product-images  (images + PDFs des produits)
-- + policies de lecture publique et upload via service role
-- Idempotent — sûr à relancer
-- ============================================================

-- 1. blog-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,           -- public = accessible sans auth (URL /object/public/)
  10485760,       -- 10 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Policy: anyone can read (public bucket already allows this, but explicit policy is safer)
DROP POLICY IF EXISTS "blog-images-public-select" ON storage.objects;
CREATE POLICY "blog-images-public-select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-images');

-- Policy: service role can upload (server-side API route uses service_role key)
DROP POLICY IF EXISTS "blog-images-service-upload" ON storage.objects;
CREATE POLICY "blog-images-service-upload" ON storage.objects
  FOR INSERT TO authenticated, service_role
  WITH CHECK (bucket_id = 'blog-images');

-- Policy: service role can delete (for admin UI delete operations)
DROP POLICY IF EXISTS "blog-images-service-delete" ON storage.objects;
CREATE POLICY "blog-images-service-delete" ON storage.objects
  FOR DELETE TO authenticated, service_role
  USING (bucket_id = 'blog-images');

-- 2. product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,       -- 10 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

DROP POLICY IF EXISTS "product-images-public-select" ON storage.objects;
CREATE POLICY "product-images-public-select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images-service-upload" ON storage.objects;
CREATE POLICY "product-images-service-upload" ON storage.objects
  FOR INSERT TO authenticated, service_role
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images-service-delete" ON storage.objects;
CREATE POLICY "product-images-service-delete" ON storage.objects
  FOR DELETE TO authenticated, service_role
  USING (bucket_id = 'product-images');

-- ============================================================
-- Récapitulatif
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'supabase-storage-buckets.sql — APPLY SUCCESS';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'Buckets créés:';
  RAISE NOTICE '  - blog-images     (public, max 10MB, images only)';
  RAISE NOTICE '  - product-images  (public, max 10MB, images + PDF)';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'NEXT: run supabase-realisations-testimonials.sql';
  RAISE NOTICE '===========================================================';
END $$;
