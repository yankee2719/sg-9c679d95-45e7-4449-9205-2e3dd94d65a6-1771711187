-- Add frequency_days column to maintenance_schedules table
ALTER TABLE maintenance_schedules 
ADD COLUMN frequency_days INTEGER;

-- Add comment to describe the column
COMMENT ON COLUMN maintenance_schedules.frequency_days 
IS 'Frequency of recurring maintenance in days (e.g., 7 for weekly, 30 for monthly, 365 for yearly)';