-- PHASE 2I: CREATE CHECKLIST_EXECUTION_ITEMS TABLE
CREATE TABLE checklist_execution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES checklist_executions(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES checklist_template_items(id) ON DELETE RESTRICT,
  is_completed BOOLEAN DEFAULT false,
  actual_value TEXT,
  notes TEXT,
  photo_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checklist_execution_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view execution items"
ON checklist_execution_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert execution items"
ON checklist_execution_items FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update execution items"
ON checklist_execution_items FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete execution items"
ON checklist_execution_items FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_execution_items_execution ON checklist_execution_items(execution_id);
CREATE INDEX idx_execution_items_template_item ON checklist_execution_items(template_item_id);