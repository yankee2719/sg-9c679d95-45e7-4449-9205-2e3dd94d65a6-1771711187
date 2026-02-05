-- Aggiorno checklist_templates
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS estimated_time INTEGER;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS equipment TEXT;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Creo checklist_tasks (se non esiste)
CREATE TABLE IF NOT EXISTS checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  task_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilito RLS su checklist_tasks
ALTER TABLE checklist_tasks ENABLE ROW LEVEL SECURITY;

-- Policy per checklist_tasks
CREATE POLICY "Users can view tasks of visible templates" ON checklist_tasks 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checklist_templates 
      WHERE checklist_templates.id = checklist_tasks.template_id
    )
  );

CREATE POLICY "Admin and supervisor can insert tasks" ON checklist_tasks 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admin and supervisor can update tasks" ON checklist_tasks 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admin and supervisor can delete tasks" ON checklist_tasks 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Indici
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_template_id ON checklist_tasks(template_id);