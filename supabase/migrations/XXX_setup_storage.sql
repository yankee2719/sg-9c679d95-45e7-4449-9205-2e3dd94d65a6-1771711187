-- ============================================
-- SUPABASE STORAGE CONFIGURATION
-- ============================================

-- 1. Crea bucket 'documents' (se non esiste)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket
  104857600, -- 100MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Policy 1: Platform Admins - Full Access
CREATE POLICY "platform_admins_all_storage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Organization Members - Upload
CREATE POLICY "org_members_upload_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  -- Extract organization_id from path: org_type/org_id/...
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin', 'manager', 'technician')
      -- Verifica che il path contenga un org_id di cui l'utente è membro
      AND (storage.foldername(name))[2]::UUID = om.organization_id
  )
);

-- Policy 3: Organization Members - Download/View
CREATE POLICY "org_members_download_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND (storage.foldername(name))[2]::UUID = om.organization_id
  )
);

-- Policy 4: Organization Members - Update (per signature metadata)
CREATE POLICY "org_admins_update_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
      AND (storage.foldername(name))[2]::UUID = om.organization_id
  )
);

-- Policy 5: Organization Owners - Delete
CREATE POLICY "org_owners_delete_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
      AND (storage.foldername(name))[2]::UUID = om.organization_id
  )
);

COMMENT ON POLICY "org_members_upload_documents" ON storage.objects IS 
'Membri con ruolo admin/manager/technician possono caricare documenti nella loro organization';