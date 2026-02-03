ALTER TABLE checklist_executions 
ADD COLUMN IF NOT EXISTS schedule_id uuid NULL REFERENCES maintenance_schedules(id) ON DELETE SET NULL;