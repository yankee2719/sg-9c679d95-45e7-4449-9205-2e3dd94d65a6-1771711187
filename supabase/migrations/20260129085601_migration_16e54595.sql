-- PHASE 2H: CREATE CHECKLIST_EXECUTIONS TABLE
CREATE TABLE checklist_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE RESTRICT,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_log_id UUID REFERENCES maintenance_logs(id) ON DELETE SET NULL,
  executed_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE checklist_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view executions"
ON checklist_executions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert executions"
ON checklist_executions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update executions"
ON checklist_executions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete executions"
ON checklist_executions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_executions_template ON checklist_executions(template_id);
CREATE INDEX idx_executions_equipment ON checklist_executions(equipment_id);
CREATE INDEX idx_executions_executed_by ON checklist_executions(executed_by);
CREATE INDEX idx_executions_status ON checklist_executions(status);
CREATE INDEX idx_executions_started_at ON checklist_executions(started_at);