-- Step 7: Add tenant_id to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);