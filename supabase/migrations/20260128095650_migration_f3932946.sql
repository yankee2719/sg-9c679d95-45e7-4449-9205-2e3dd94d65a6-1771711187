-- Create junction table for maintenance schedules and checklists
CREATE TABLE IF NOT EXISTS maintenance_schedule_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES maintenance_schedules(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  execution_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_schedule_template UNIQUE(schedule_id, template_id)
);

-- Add schedule_id to checklist_executions to track which maintenance it belongs to
ALTER TABLE checklist_executions 
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_checklists_schedule 
  ON maintenance_schedule_checklists(schedule_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_checklists_template 
  ON maintenance_schedule_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_executions_schedule 
  ON checklist_executions(schedule_id);

-- RLS Policies for maintenance_schedule_checklists
ALTER TABLE maintenance_schedule_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedule checklists" 
  ON maintenance_schedule_checklists FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and supervisors can manage schedule checklists" 
  ON maintenance_schedule_checklists FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Comments for documentation
COMMENT ON TABLE maintenance_schedule_checklists IS 
  'Junction table linking maintenance schedules to checklist templates';
COMMENT ON COLUMN maintenance_schedule_checklists.is_required IS 
  'Whether this checklist is required for completing the maintenance';
COMMENT ON COLUMN maintenance_schedule_checklists.execution_order IS 
  'Suggested order for executing checklists (1, 2, 3...)';
COMMENT ON COLUMN checklist_executions.schedule_id IS 
  'Link to maintenance schedule if this execution is part of scheduled maintenance';