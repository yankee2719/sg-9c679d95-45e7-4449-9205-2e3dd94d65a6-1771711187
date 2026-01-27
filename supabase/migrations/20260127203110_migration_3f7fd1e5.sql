-- Enable RLS on equipment table
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view equipment (authenticated users)
CREATE POLICY "Authenticated users can view equipment" 
ON equipment 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert equipment
CREATE POLICY "Authenticated users can insert equipment" 
ON equipment 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update equipment
CREATE POLICY "Authenticated users can update equipment" 
ON equipment 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can delete equipment
CREATE POLICY "Authenticated users can delete equipment" 
ON equipment 
FOR DELETE 
USING (auth.uid() IS NOT NULL);