-- Make generated-pdfs bucket public for PDF sharing
UPDATE storage.buckets SET public = true WHERE id = 'generated-pdfs';

-- Create policy for anyone to read PDFs (public access for sharing)
CREATE POLICY "PDFs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-pdfs');

-- Create policy for authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-pdfs');

-- Create policy for authenticated users to update their PDFs
CREATE POLICY "Authenticated users can update PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-pdfs');