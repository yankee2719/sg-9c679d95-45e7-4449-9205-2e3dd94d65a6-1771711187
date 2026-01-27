-- Create storage bucket for equipment documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-documents',
  'equipment-documents',
  true,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/dwg',
    'application/dxf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for equipment-documents bucket
CREATE POLICY "Allow public read access to equipment documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-documents');

CREATE POLICY "Allow authenticated users to upload equipment documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete their equipment documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'equipment-documents' 
  AND auth.role() = 'authenticated'
);