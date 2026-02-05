-- Step 5: Add tenant_id to checklists table
ALTER TABLE checklists 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_checklists_tenant ON checklists(tenant_id);