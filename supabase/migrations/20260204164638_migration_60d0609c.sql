-- Step 13: Update RLS policies for documents
DROP POLICY IF EXISTS "Users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can insert documents" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;

CREATE POLICY "Users can view documents in their tenant" ON documents
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents in their tenant" ON documents
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins and document owners can delete documents" ON documents
  FOR DELETE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) AND
    (uploaded_by = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  );