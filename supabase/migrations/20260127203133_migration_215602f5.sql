-- Enable RLS and create policies for checklist_templates table
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view templates
CREATE POLICY "Authenticated users can view templates" 
ON checklist_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert templates
CREATE POLICY "Authenticated users can insert templates" 
ON checklist_templates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can update templates
CREATE POLICY "Authenticated users can update templates" 
ON checklist_templates 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can delete templates
CREATE POLICY "Authenticated users can delete templates" 
ON checklist_templates 
FOR DELETE 
USING (auth.uid() IS NOT NULL);