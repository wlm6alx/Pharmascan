-- À exécuter dans l’éditeur SQL Supabase après supabase-schema.sql
-- Crée les buckets et les politiques Storage pour l’inscription (attestation, photo)

INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-documents', 'pharmacy-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pharmacy-photos', 'pharmacy-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques sur storage.objects (les noms peuvent être adaptés)
DROP POLICY IF EXISTS "Authenticated upload pharmacy-documents" ON storage.objects;
CREATE POLICY "Authenticated upload pharmacy-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pharmacy-documents');

DROP POLICY IF EXISTS "Authenticated upload pharmacy-photos" ON storage.objects;
CREATE POLICY "Authenticated upload pharmacy-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pharmacy-photos');

DROP POLICY IF EXISTS "Public read pharmacy-documents" ON storage.objects;
CREATE POLICY "Public read pharmacy-documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pharmacy-documents');

DROP POLICY IF EXISTS "Public read pharmacy-photos" ON storage.objects;
CREATE POLICY "Public read pharmacy-photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'pharmacy-photos');
