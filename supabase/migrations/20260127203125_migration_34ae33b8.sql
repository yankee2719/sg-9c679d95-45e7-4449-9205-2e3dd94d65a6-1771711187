-- Enable RLS and create policies for maintenance_schedules table
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view maintenance schedules
CREATE POLICY "Authenticated users can view schedules" 
ON maintenance_schedules 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert schedules
CREATE POLICY "Authenticated users can insert schedules" 
ON maintenance_schedules 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update schedules
CREATE POLICY "Authenticated users can update schedules" 
ON maintenance_schedules 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can delete schedules
CREATE POLICY "Authenticated users can delete schedules" 
ON maintenance_schedules 
FOR DELETE 
USING (auth.uid() IS NOT NULL);