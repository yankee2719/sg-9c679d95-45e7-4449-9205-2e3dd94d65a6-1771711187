-- Enable RLS and create policies for equipment_categories table
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view categories
CREATE POLICY "Authenticated users can view categories" 
ON equipment_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert categories
CREATE POLICY "Authenticated users can insert categories" 
ON equipment_categories 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update categories
CREATE POLICY "Authenticated users can update categories" 
ON equipment_categories 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can delete categories
CREATE POLICY "Authenticated users can delete categories" 
ON equipment_categories 
FOR DELETE 
USING (auth.uid() IS NOT NULL);