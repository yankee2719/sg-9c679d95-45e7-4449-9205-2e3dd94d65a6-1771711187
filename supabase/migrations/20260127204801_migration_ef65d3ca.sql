-- Create enum type for maintenance_type
CREATE TYPE maintenance_type_enum AS ENUM ('preventive', 'corrective', 'predictive', 'extraordinary');

-- Add maintenance_type column to maintenance_schedules table
ALTER TABLE maintenance_schedules 
ADD COLUMN maintenance_type maintenance_type_enum DEFAULT 'preventive' NOT NULL;

-- Add comment
COMMENT ON COLUMN maintenance_schedules.maintenance_type 
IS 'Type of maintenance: preventive (scheduled), corrective (repair), predictive (condition-based), extraordinary (one-time special)';