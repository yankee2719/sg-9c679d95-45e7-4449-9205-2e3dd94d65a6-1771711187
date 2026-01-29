-- PHASE 2E: CREATE MAINTENANCE_LOGS TABLE
CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'predictive', 'corrective', 'inspection')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER,
  notes TEXT,
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  costs NUMERIC(10,2),
  photos JSONB DEFAULT '[]'::jsonb,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view logs"
ON maintenance_logs FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert logs"
ON maintenance_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update logs"
ON maintenance_logs FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete logs"
ON maintenance_logs FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_logs_equipment ON maintenance_logs(equipment_id);
CREATE INDEX idx_logs_schedule ON maintenance_logs(schedule_id);
CREATE INDEX idx_logs_performed_by ON maintenance_logs(performed_by);
CREATE INDEX idx_logs_performed_at ON maintenance_logs(performed_at);
CREATE INDEX idx_logs_status ON maintenance_logs(status);