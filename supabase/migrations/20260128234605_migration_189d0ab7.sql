-- STEP 1: DROP ALL EXISTING TABLES (IF ANY) - CASCADE to remove dependencies
DROP TABLE IF EXISTS public.checklist_execution_steps CASCADE;
DROP TABLE IF EXISTS public.checklist_executions CASCADE;
DROP TABLE IF EXISTS public.checklist_template_steps CASCADE;
DROP TABLE IF EXISTS public.checklist_templates CASCADE;
DROP TABLE IF EXISTS public.equipment_documents CASCADE;
DROP TABLE IF EXISTS public.maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.equipment_categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop the RPC function if exists
DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text);

-- Confirm all tables are dropped
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'equipment', 'equipment_categories', 'maintenance_schedules', 'maintenance_logs', 'checklist_templates', 'checklist_executions', 'equipment_documents');