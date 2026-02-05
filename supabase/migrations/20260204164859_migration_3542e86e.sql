-- Fix checklist_executions policies - use executed_by instead of user_id
DROP POLICY IF EXISTS "Technicians can insert executions" ON checklist_executions;
DROP POLICY IF EXISTS "Technicians can update their executions" ON checklist_executions;

CREATE POLICY "Technicians can insert executions" ON checklist_executions
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) AND
    executed_by = auth.uid()
  );

CREATE POLICY "Technicians can update their executions" ON checklist_executions
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) AND
    executed_by = auth.uid()
  );