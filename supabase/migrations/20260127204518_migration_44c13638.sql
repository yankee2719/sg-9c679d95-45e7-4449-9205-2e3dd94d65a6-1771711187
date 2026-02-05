-- Add is_active column to maintenance_schedules table
ALTER TABLE maintenance_schedules 
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Add comment
COMMENT ON COLUMN maintenance_schedules.is_active 
IS 'Indicates if the maintenance schedule is active or has been deactivated';