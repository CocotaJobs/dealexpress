-- =====================================================
-- Security Fix: Make generated-pdfs bucket private
-- =====================================================

-- 1. Update bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'generated-pdfs';

-- 2. Drop the public access policy
DROP POLICY IF EXISTS "PDFs are publicly accessible" ON storage.objects;

-- 3. Keep existing authenticated policies for upload/update/delete
-- (they already check organization_id via folder path)