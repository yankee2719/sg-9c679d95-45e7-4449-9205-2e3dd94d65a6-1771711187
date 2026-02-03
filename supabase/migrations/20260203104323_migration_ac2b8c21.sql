-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete checklist images" ON storage.objects;

-- Create storage policies for checklist images
CREATE POLICY "Anyone can view checklist images"
ON storage.objects FOR SELECT
USING (bucket_id = 'checklist-images');

CREATE POLICY "Authenticated users can upload checklist images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'checklist-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their checklist images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'checklist-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can delete checklist images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'checklist-images' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'supervisor')
  )
);