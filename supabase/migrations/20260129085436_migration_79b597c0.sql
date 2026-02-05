-- PHASE 1: DROP ALL EXISTING TABLES
-- Drop in correct order (dependents first)
DROP TABLE IF EXISTS checklist_execution_items CASCADE;
DROP TABLE IF EXISTS checklist_executions CASCADE;
DROP TABLE IF EXISTS checklist_template_items CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS maintenance_schedules CASCADE;
DROP TABLE IF EXISTS equipment_documents CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS two_factor_auth CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;