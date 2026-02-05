-- 2. ADD MISSING COLUMN TO DOCUMENTS TABLE (Fixes TypeScript error)
ALTER TABLE public.equipment_documents ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. ENSURE PERMISSIONS ARE RELOADED
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. RELOAD SCHEMA CACHE AGAIN
SELECT pg_notify('pgrst', 'reload schema');