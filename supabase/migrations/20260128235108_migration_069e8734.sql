-- Add missing columns to restore compatibility with existing code
ALTER TABLE public.checklist_templates 
ADD COLUMN IF NOT EXISTS estimated_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS equipment TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.checklist_executions
ADD COLUMN IF NOT EXISTS total_duration INTEGER DEFAULT 0;

ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS notes TEXT;