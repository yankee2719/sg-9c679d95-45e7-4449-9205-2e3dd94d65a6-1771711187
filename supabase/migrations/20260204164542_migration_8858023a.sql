-- Step 3: Add tenant_id to equipment table
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_equipment_tenant ON equipment(tenant_id);