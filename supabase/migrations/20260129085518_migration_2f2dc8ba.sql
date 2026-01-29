-- PHASE 2D: CREATE MAINTENANCE_SCHEDULES TABLE
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'predictive', 'corrective', 'inspection')),
  frequency_days INTEGER NOT NULL,
  last_maintenance_date DATE,
  next_maintenance_date DATE NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view schedules"
ON maintenance_schedules FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert schedules"
ON maintenance_schedules FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update schedules"
ON maintenance_schedules FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete schedules"
ON maintenance_schedules FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_schedules_equipment ON maintenance_schedules(equipment_id);
CREATE INDEX idx_schedules_next_date ON maintenance_schedules(next_maintenance_date);
CREATE INDEX idx_schedules_assigned_to ON maintenance_schedules(assigned_to);
CREATE INDEX idx_schedules_priority ON maintenance_schedules(priority);