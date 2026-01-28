-- Fix Foreign Key Constraint to allow Cascade Delete on template_id
ALTER TABLE checklist_executions 
DROP CONSTRAINT IF EXISTS checklist_executions_template_id_fkey;

ALTER TABLE checklist_executions 
ADD CONSTRAINT checklist_executions_template_id_fkey 
FOREIGN KEY (template_id) 
REFERENCES checklist_templates(id) 
ON DELETE CASCADE;