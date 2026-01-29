-- PHASE 2C: CREATE EQUIPMENT_DOCUMENTS TABLE
CREATE TABLE equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  version TEXT DEFAULT '1.0',
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view documents"
ON equipment_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert documents"
ON equipment_documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update documents"
ON equipment_documents FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete documents"
ON equipment_documents FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_documents_equipment ON equipment_documents(equipment_id);
CREATE INDEX idx_documents_uploaded_by ON equipment_documents(uploaded_by);