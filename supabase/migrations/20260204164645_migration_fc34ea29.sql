-- Step 14: Create RLS policies for tenants table
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their tenant" ON tenants
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );