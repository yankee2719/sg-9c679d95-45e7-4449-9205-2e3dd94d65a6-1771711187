-- ============================================
-- PHASE 1: NUCLEAR RESET - DROP EVERYTHING
-- ============================================

-- Drop all tables with CASCADE to remove dependencies
DROP TABLE IF EXISTS public.checklist_execution_items CASCADE;
DROP TABLE IF EXISTS public.checklist_executions CASCADE;
DROP TABLE IF EXISTS public.checklist_template_items CASCADE;
DROP TABLE IF EXISTS public.checklist_templates CASCADE;
DROP TABLE IF EXISTS public.maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.maintenance_schedules CASCADE;
DROP TABLE IF EXISTS public.equipment_documents CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.two_factor_auth CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_maintenance_due() CASCADE;
DROP FUNCTION IF EXISTS public.send_notification() CASCADE;

-- Success message
SELECT 'All tables dropped successfully' as status;