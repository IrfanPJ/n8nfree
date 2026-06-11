-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('fabric-images',        'fabric-images',        true, 20971520,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']),
  ('order-styling-images', 'order-styling-images', true, 20971520,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']),
  ('measurement-images',   'measurement-images',   true, 20971520,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO NOTHING;

-- Drop then recreate policies (idempotent pattern for older Postgres)
DROP POLICY IF EXISTS "Authenticated upload fabric-images"        ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload order-styling-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload measurement-images"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete fabric-images"        ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete order-styling-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete measurement-images"   ON storage.objects;
DROP POLICY IF EXISTS "Public read fabric-images"                 ON storage.objects;
DROP POLICY IF EXISTS "Public read order-styling-images"          ON storage.objects;
DROP POLICY IF EXISTS "Public read measurement-images"            ON storage.objects;

CREATE POLICY "Authenticated upload fabric-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fabric-images');

CREATE POLICY "Authenticated upload order-styling-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-styling-images');

CREATE POLICY "Authenticated upload measurement-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'measurement-images');

CREATE POLICY "Authenticated delete fabric-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fabric-images');

CREATE POLICY "Authenticated delete order-styling-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'order-styling-images');

CREATE POLICY "Authenticated delete measurement-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'measurement-images');

CREATE POLICY "Public read fabric-images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'fabric-images');

CREATE POLICY "Public read order-styling-images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'order-styling-images');

CREATE POLICY "Public read measurement-images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'measurement-images');
