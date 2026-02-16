-- ============================================================
    --MIGRATION: Simplify roles to admin / supervisor / technician
--NUCLEAR VERSION: drops ALL RLS policies, rebuilds everything
-- ============================================================

    BEGIN;

-- ══════════════════════════════════════════════════════════════
--PHASE 1: Convert membership role to text
-- ══════════════════════════════════════════════════════════════
ALTER TABLE organization_memberships 
  ALTER COLUMN role DROP DEFAULT,
    ALTER COLUMN role TYPE text USING role:: text;

UPDATE organization_memberships SET role = CASE role
    WHEN 'owner'         THEN 'admin'
    WHEN 'plant_manager' THEN 'supervisor'
    WHEN 'viewer'        THEN 'technician'
    ELSE role
END;

-- ══════════════════════════════════════════════════════════════
--PHASE 2: Drop ALL policies(every single one)
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "platform_admins_select" ON platform_admins;
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "membership_select" ON organization_memberships;
DROP POLICY IF EXISTS "membership_insert" ON organization_memberships;
DROP POLICY IF EXISTS "membership_update" ON organization_memberships;
DROP POLICY IF EXISTS "membership_delete" ON organization_memberships;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "plants_select" ON plants;
DROP POLICY IF EXISTS "plants_insert" ON plants;
DROP POLICY IF EXISTS "plants_update" ON plants;
DROP POLICY IF EXISTS "plant_assign_select" ON plant_assignments;
DROP POLICY IF EXISTS "plant_assign_insert" ON plant_assignments;
DROP POLICY IF EXISTS "plant_assign_delete" ON plant_assignments;
DROP POLICY IF EXISTS "machines_select" ON machines;
DROP POLICY IF EXISTS "machines_insert" ON machines;
DROP POLICY IF EXISTS "machines_update" ON machines;
DROP POLICY IF EXISTS "events_select" ON machine_events;
DROP POLICY IF EXISTS "events_insert" ON machine_events;
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "doc_versions_select" ON document_versions;
DROP POLICY IF EXISTS "doc_versions_insert" ON document_versions;
DROP POLICY IF EXISTS "doc_audit_select" ON document_audit_logs;
DROP POLICY IF EXISTS "doc_audit_insert" ON document_audit_logs;
DROP POLICY IF EXISTS "maint_plans_select" ON maintenance_plans;
DROP POLICY IF EXISTS "maint_plans_insert" ON maintenance_plans;
DROP POLICY IF EXISTS "maint_plans_update" ON maintenance_plans;
DROP POLICY IF EXISTS "work_orders_select" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update" ON work_orders;
DROP POLICY IF EXISTS "checklists_select" ON checklists;
DROP POLICY IF EXISTS "checklists_insert" ON checklists;
DROP POLICY IF EXISTS "checklists_update" ON checklists;
DROP POLICY IF EXISTS "checklist_items_select" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_insert" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_update" ON checklist_items;
DROP POLICY IF EXISTS "checklist_exec_select" ON checklist_executions;
DROP POLICY IF EXISTS "checklist_exec_insert" ON checklist_executions;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "storage_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_delete" ON storage.objects;

-- ══════════════════════════════════════════════════════════════
--PHASE 3: Drop functions that reference org_role
-- ══════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS has_org_role(UUID, org_role);
DROP FUNCTION IF EXISTS has_plant_access(UUID);

-- ══════════════════════════════════════════════════════════════
--PHASE 4: Swap enum
-- ══════════════════════════════════════════════════════════════
DROP TYPE org_role;
CREATE TYPE org_role AS ENUM('admin', 'supervisor', 'technician');

ALTER TABLE organization_memberships 
  ALTER COLUMN role TYPE org_role USING role:: org_role,
    ALTER COLUMN role SET DEFAULT 'technician':: org_role,
        ALTER COLUMN role SET NOT NULL;

-- ══════════════════════════════════════════════════════════════
--PHASE 5: Rebuild functions
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION has_org_role(
    p_org_id UUID,
    p_min_role org_role
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_rank INTEGER;
    v_user_rank INTEGER;
BEGIN
v_role_rank:= CASE p_min_role
        WHEN 'admin' THEN 3
        WHEN 'supervisor' THEN 2
        WHEN 'technician' THEN 1
END;
    SELECT CASE om.role
        WHEN 'admin' THEN 3
        WHEN 'supervisor' THEN 2
        WHEN 'technician' THEN 1
        ELSE 0
    END INTO v_user_rank
    FROM organization_memberships om
    WHERE om.organization_id = p_org_id
    AND om.user_id = auth.uid()
    AND om.is_active = true;
    RETURN COALESCE(v_user_rank >= v_role_rank, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_plant_access(p_plant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role org_role;
BEGIN
    SELECT organization_id INTO v_org_id FROM plants WHERE id = p_plant_id;
    IF v_org_id IS NULL THEN RETURN false; END IF;
    SELECT role INTO v_user_role
    FROM organization_memberships
    WHERE organization_id = v_org_id AND user_id = auth.uid() AND is_active = true;
    IF v_user_role IS NULL THEN RETURN false; END IF;
    IF v_user_role = 'admin' THEN RETURN true; END IF;
    RETURN EXISTS(
    SELECT 1 FROM plant_assignments
        WHERE plant_id = p_plant_id AND user_id = auth.uid() AND is_active = true
);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_org_role TO authenticated;
GRANT EXECUTE ON FUNCTION has_plant_access TO authenticated;

-- ══════════════════════════════════════════════════════════════
--PHASE 6: Rebuild ALL policies(identical to original schema)
-- ══════════════════════════════════════════════════════════════

--Platform admins
CREATE POLICY "platform_admins_select" ON platform_admins
    FOR SELECT USING(user_id = auth.uid() OR is_platform_admin());

--Organizations
CREATE POLICY "org_select" ON organizations
    FOR SELECT USING(id = ANY(get_user_org_ids()) OR is_platform_admin());
CREATE POLICY "org_insert" ON organizations
    FOR INSERT WITH CHECK(auth.uid() IS NOT NULL);
CREATE POLICY "org_update" ON organizations
    FOR UPDATE USING(has_org_role(id, 'admin') OR is_platform_admin());

--Memberships
CREATE POLICY "membership_select" ON organization_memberships
    FOR SELECT USING(
    user_id = auth.uid()
        OR organization_id = ANY(get_user_org_ids())
        OR is_platform_admin()
);
CREATE POLICY "membership_insert" ON organization_memberships
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'admin') OR is_platform_admin());
CREATE POLICY "membership_update" ON organization_memberships
    FOR UPDATE USING(has_org_role(organization_id, 'admin') OR is_platform_admin());
CREATE POLICY "membership_delete" ON organization_memberships
    FOR DELETE USING(
    user_id = auth.uid()
        OR has_org_role(organization_id, 'admin')
        OR is_platform_admin()
);

--Profiles
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING(
    id = auth.uid()
        OR id IN(
        SELECT om2.user_id FROM organization_memberships om2
            WHERE om2.organization_id = ANY(get_user_org_ids()) AND om2.is_active = true
    )
        OR is_platform_admin()
);
CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE USING(id = auth.uid());

--Plants
CREATE POLICY "plants_select" ON plants
    FOR SELECT USING(has_plant_access(id) OR is_platform_admin());
CREATE POLICY "plants_insert" ON plants
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'admin') OR is_platform_admin());
CREATE POLICY "plants_update" ON plants
    FOR UPDATE USING(has_org_role(organization_id, 'admin') OR is_platform_admin());

--Plant assignments
CREATE POLICY "plant_assign_select" ON plant_assignments
    FOR SELECT USING(
    user_id = auth.uid()
        OR plant_id IN(SELECT id FROM plants WHERE organization_id = ANY(get_user_org_ids()))
        OR is_platform_admin()
);
CREATE POLICY "plant_assign_insert" ON plant_assignments
    FOR INSERT WITH CHECK(
    EXISTS(SELECT 1 FROM plants p WHERE p.id = plant_id AND has_org_role(p.organization_id, 'admin'))
        OR is_platform_admin()
);
CREATE POLICY "plant_assign_delete" ON plant_assignments
    FOR DELETE USING(
    EXISTS(SELECT 1 FROM plants p WHERE p.id = plant_id AND has_org_role(p.organization_id, 'admin'))
        OR is_platform_admin()
);

--Machines
CREATE POLICY "machines_select" ON machines
    FOR SELECT USING(has_plant_access(plant_id) OR is_platform_admin());
CREATE POLICY "machines_insert" ON machines
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'admin') OR is_platform_admin());
CREATE POLICY "machines_update" ON machines
    FOR UPDATE USING(has_org_role(organization_id, 'technician') OR is_platform_admin());

--Machine events
CREATE POLICY "events_select" ON machine_events
    FOR SELECT USING(organization_id = ANY(get_user_org_ids()) OR is_platform_admin());
CREATE POLICY "events_insert" ON machine_events
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'technician') OR is_platform_admin());

--Documents
CREATE POLICY "documents_select" ON documents
    FOR SELECT USING(organization_id = ANY(get_user_org_ids()) OR is_platform_admin());
CREATE POLICY "documents_insert" ON documents
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'technician') OR is_platform_admin());
CREATE POLICY "documents_update" ON documents
    FOR UPDATE USING(has_org_role(organization_id, 'admin') OR is_platform_admin());

--Document versions
CREATE POLICY "doc_versions_select" ON document_versions
    FOR SELECT USING(
    EXISTS(SELECT 1 FROM documents d WHERE d.id = document_id
            AND(d.organization_id = ANY(get_user_org_ids()) OR is_platform_admin()))
);
CREATE POLICY "doc_versions_insert" ON document_versions
    FOR INSERT WITH CHECK(
    EXISTS(SELECT 1 FROM documents d WHERE d.id = document_id
            AND(has_org_role(d.organization_id, 'technician') OR is_platform_admin()))
);

--Document audit logs
CREATE POLICY "doc_audit_select" ON document_audit_logs
    FOR SELECT USING(
    EXISTS(SELECT 1 FROM documents d WHERE d.id = document_id
            AND(d.organization_id = ANY(get_user_org_ids()) OR is_platform_admin()))
);
CREATE POLICY "doc_audit_insert" ON document_audit_logs
    FOR INSERT WITH CHECK(true);

--Maintenance plans
CREATE POLICY "maint_plans_select" ON maintenance_plans
    FOR SELECT USING(organization_id = ANY(get_user_org_ids()) OR is_platform_admin());
CREATE POLICY "maint_plans_insert" ON maintenance_plans
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'admin') OR is_platform_admin());
CREATE POLICY "maint_plans_update" ON maintenance_plans
    FOR UPDATE USING(has_org_role(organization_id, 'admin') OR is_platform_admin());

--Work orders
CREATE POLICY "work_orders_select" ON work_orders
    FOR SELECT USING(organization_id = ANY(get_user_org_ids()) OR is_platform_admin());
CREATE POLICY "work_orders_insert" ON work_orders
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'technician') OR is_platform_admin());
CREATE POLICY "work_orders_update" ON work_orders
    FOR UPDATE USING(
    (assigned_to = auth.uid() OR has_org_role(organization_id, 'admin') OR is_platform_admin())
        AND status != 'completed'
    );

--Checklists
CREATE POLICY "checklists_select" ON checklists
    FOR SELECT USING(organization_id = ANY(get_user_org_ids()) OR is_platform_admin());
CREATE POLICY "checklists_insert" ON checklists
    FOR INSERT WITH CHECK(has_org_role(organization_id, 'admin') OR is_platform_admin());
CREATE POLICY "checklists_update" ON checklists
    FOR UPDATE USING(has_org_role(organization_id, 'admin') OR is_platform_admin());

--Checklist items
CREATE POLICY "checklist_items_select" ON checklist_items
    FOR SELECT USING(
    EXISTS(SELECT 1 FROM checklists c WHERE c.id = checklist_id
            AND(c.organization_id = ANY(get_user_org_ids()) OR is_platform_admin()))
);
CREATE POLICY "checklist_items_insert" ON checklist_items
    FOR INSERT WITH CHECK(
    EXISTS(SELECT 1 FROM checklists c WHERE c.id = checklist_id
            AND(has_org_role(c.organization_id, 'admin') OR is_platform_admin()))
);
CREATE POLICY "checklist_items_update" ON checklist_items
    FOR UPDATE USING(
    EXISTS(SELECT 1 FROM checklists c WHERE c.id = checklist_id
            AND(has_org_role(c.organization_id, 'admin') OR is_platform_admin()))
);

--Checklist executions
CREATE POLICY "checklist_exec_select" ON checklist_executions
    FOR SELECT USING(
    EXISTS(SELECT 1 FROM checklists c WHERE c.id = checklist_id
            AND(c.organization_id = ANY(get_user_org_ids()) OR is_platform_admin()))
);
CREATE POLICY "checklist_exec_insert" ON checklist_executions
    FOR INSERT WITH CHECK(
    EXISTS(SELECT 1 FROM checklists c WHERE c.id = checklist_id
            AND(has_org_role(c.organization_id, 'technician') OR is_platform_admin()))
);

--Notifications
CREATE POLICY "notifications_select" ON notifications
    FOR SELECT USING(user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications
    FOR UPDATE USING(user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications
    FOR INSERT WITH CHECK(true);

--Storage
CREATE POLICY "storage_documents_select" ON storage.objects
    FOR SELECT USING(
    bucket_id = 'documents' AND(storage.foldername(name))[1]:: uuid = ANY(get_user_org_ids())
);
CREATE POLICY "storage_documents_insert" ON storage.objects
    FOR INSERT WITH CHECK(
    bucket_id = 'documents' AND(storage.foldername(name))[1]:: uuid = ANY(get_user_org_ids())
);
CREATE POLICY "storage_documents_update" ON storage.objects
    FOR UPDATE USING(
    bucket_id = 'documents' AND(storage.foldername(name))[1]:: uuid = ANY(get_user_org_ids())
);
CREATE POLICY "storage_documents_delete" ON storage.objects
    FOR DELETE USING(
    bucket_id = 'documents' AND(storage.foldername(name))[1]:: uuid = ANY(get_user_org_ids())
);

COMMIT;

-- ══════════════════════════════════════════════════════════════
--VERIFY
-- ══════════════════════════════════════════════════════════════
SELECT unnest(enum_range(NULL:: org_role)) AS available_roles;
SELECT user_id, role, is_active FROM organization_memberships;

