-- Create equipment_specifications table for dynamic technical specifications
CREATE TABLE IF NOT EXISTS equipment_specifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment_specifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view equipment specifications" 
  ON equipment_specifications FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert equipment specifications" 
  ON equipment_specifications FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update equipment specifications" 
  ON equipment_specifications FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete equipment specifications" 
  ON equipment_specifications FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_specifications_equipment_id 
  ON equipment_specifications(equipment_id);

COMMENT ON TABLE equipment_specifications IS 'Dynamic technical specifications for equipment';