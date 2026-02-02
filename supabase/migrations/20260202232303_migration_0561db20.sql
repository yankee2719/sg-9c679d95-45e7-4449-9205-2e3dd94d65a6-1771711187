ALTER TABLE maintenance_schedules 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS priority text NULL DEFAULT 'medium';

ALTER TABLE maintenance_schedules 
ADD CONSTRAINT maintenance_schedules_status_check 
CHECK (status IN ('scheduled', 'pending', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE maintenance_schedules 
ADD CONSTRAINT maintenance_schedules_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));