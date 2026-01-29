-- PHASE 2F: CREATE CHECKLIST_TEMPLATES TABLE
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  equipment_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view templates"
ON checklist_templates FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert templates"
ON checklist_templates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update templates"
ON checklist_templates FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete templates"
ON checklist_templates FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_templates_category ON checklist_templates(category);
CREATE INDEX idx_templates_equipment_type ON checklist_templates(equipment_type);