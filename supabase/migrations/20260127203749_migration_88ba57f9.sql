-- Add estimated_duration_minutes column to maintenance_schedules table
ALTER TABLE maintenance_schedules
ADD COLUMN estimated_duration_minutes integer NULL;

-- Add comment to document the column
COMMENT ON COLUMN maintenance_schedules.estimated_duration_minutes 
IS 'Estimated duration of the maintenance task in minutes';