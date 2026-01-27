-- Create equipment_documents table for file uploads and cloud links
CREATE TABLE IF NOT EXISTS equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  
  -- Document info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'user_manual',
    'maintenance_manual',
    'electrical_schema',
    'pneumatic_schema',
    'technical_drawing',
    'certificate',
    'other'
  )),
  
  -- File or link
  document_type TEXT NOT NULL CHECK (document_type IN ('file', 'link')),
  file_path TEXT,  -- Supabase Storage path for uploaded files
  file_name TEXT,  -- Original filename
  file_size INTEGER,  -- File size in bytes
  file_type TEXT,  -- MIME type (application/pdf, image/png, etc.)
  external_url TEXT,  -- URL for cloud documents
  
  -- Metadata
  version TEXT,  -- Document version (e.g., "v1.0", "Rev.2")
  tags TEXT[],  -- Array of tags for search
  uploaded_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT file_or_link_required CHECK (
    (document_type = 'file' AND file_path IS NOT NULL) OR
    (document_type = 'link' AND external_url IS NOT NULL)
  )
);

-- Create index for faster queries
CREATE INDEX idx_equipment_documents_equipment_id ON equipment_documents(equipment_id);
CREATE INDEX idx_equipment_documents_category ON equipment_documents(category);
CREATE INDEX idx_equipment_documents_type ON equipment_documents(document_type);

-- Enable RLS
ALTER TABLE equipment_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view documents" ON equipment_documents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert documents" ON equipment_documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own documents" ON equipment_documents FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Users can delete their own documents" ON equipment_documents FOR DELETE USING (auth.uid() = uploaded_by);
CREATE POLICY "Admins can manage all documents" ON equipment_documents FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_equipment_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipment_documents_updated_at
  BEFORE UPDATE ON equipment_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_documents_updated_at();

-- Add comments
COMMENT ON TABLE equipment_documents IS 'Storage for equipment documentation files and cloud links';
COMMENT ON COLUMN equipment_documents.document_type IS 'Type: file (uploaded) or link (cloud document URL)';
COMMENT ON COLUMN equipment_documents.category IS 'Document category for organization';
COMMENT ON COLUMN equipment_documents.file_path IS 'Supabase Storage path for uploaded files';
COMMENT ON COLUMN equipment_documents.external_url IS 'URL for cloud-hosted documents (Google Drive, Dropbox, etc.)';