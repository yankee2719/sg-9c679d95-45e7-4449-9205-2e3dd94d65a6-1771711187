-- Step 11: Update RLS policies for checklists
DROP POLICY IF EXISTS "Users can view checklists" ON checklists;
DROP POLICY IF EXISTS "Users can insert checklists" ON checklists;
DROP POLICY IF EXISTS "Users can update checklists" ON checklists;
DROP POLICY IF EXISTS "Users can delete checklists" ON checklists;

CREATE POLICY "Users can view checklists in their tenant" ON checklists
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and supervisors can insert checklists" ON checklists
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can update checklists" ON checklists
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins can delete checklists" ON checklists
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );