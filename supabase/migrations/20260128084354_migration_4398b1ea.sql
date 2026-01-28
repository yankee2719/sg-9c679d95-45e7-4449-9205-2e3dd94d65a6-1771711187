-- Modifico la tabella checklist_executions esistente per renderla compatibile e più flessibile
ALTER TABLE checklist_executions 
  ALTER COLUMN maintenance_log_id DROP NOT NULL, -- Rendo opzionale il collegamento a maintenance_logs per ora
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES checklist_templates(id), -- Aggiungo template_id per coerenza col mio codice
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS total_duration INTEGER,
  ADD COLUMN IF NOT EXISTS signature_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migro i dati se necessario (copio checklist_template_id in template_id se presente)
UPDATE checklist_executions SET template_id = checklist_template_id WHERE template_id IS NULL;

-- Creo la tabella items se non esiste
CREATE TABLE IF NOT EXISTS checklist_execution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES checklist_executions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES checklist_tasks(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abilito RLS su items
ALTER TABLE checklist_execution_items ENABLE ROW LEVEL SECURITY;

-- Creo policies per items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checklist_execution_items' AND policyname = 'Users can view execution items') THEN
        CREATE POLICY "Users can view execution items" ON checklist_execution_items FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checklist_execution_items' AND policyname = 'Users can insert execution items') THEN
        CREATE POLICY "Users can insert execution items" ON checklist_execution_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checklist_execution_items' AND policyname = 'Users can update execution items') THEN
        CREATE POLICY "Users can update execution items" ON checklist_execution_items FOR UPDATE USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Indici
CREATE INDEX IF NOT EXISTS idx_checklist_execution_items_execution_id ON checklist_execution_items(execution_id);