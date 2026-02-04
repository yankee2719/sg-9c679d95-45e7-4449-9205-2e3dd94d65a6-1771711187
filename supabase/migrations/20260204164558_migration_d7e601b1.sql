-- Step 6: Add tenant_id to checklist_executions table
ALTER TABLE checklist_executions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_checklist_executions_tenant ON checklist_executions(tenant_id);