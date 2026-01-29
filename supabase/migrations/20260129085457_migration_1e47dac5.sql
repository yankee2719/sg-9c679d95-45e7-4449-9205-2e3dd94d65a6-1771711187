-- PHASE 2B: CREATE EQUIPMENT TABLE
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  equipment_code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'under_maintenance', 'inactive', 'retired')),
  qr_code TEXT UNIQUE,
  technical_specs JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Everyone can view equipment"
ON equipment FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert equipment"
ON equipment FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update equipment"
ON equipment FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete equipment"
ON equipment FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_equipment_code ON equipment(equipment_code);
CREATE INDEX idx_equipment_qr_code ON equipment(qr_code);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_category ON equipment(category);