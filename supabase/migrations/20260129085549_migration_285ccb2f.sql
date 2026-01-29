-- PHASE 2G: CREATE CHECKLIST_TEMPLATE_ITEMS TABLE
CREATE TABLE checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  requires_photo BOOLEAN DEFAULT false,
  requires_note BOOLEAN DEFAULT false,
  expected_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view template items"
ON checklist_template_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert template items"
ON checklist_template_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update template items"
ON checklist_template_items FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete template items"
ON checklist_template_items FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_template_items_template ON checklist_template_items(template_id);
CREATE INDEX idx_template_items_order ON checklist_template_items(item_order);