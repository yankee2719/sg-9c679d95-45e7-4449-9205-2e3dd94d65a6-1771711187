-- Add missing due_date column to maintenance_schedules
ALTER TABLE public.maintenance_schedules 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add index for due_date
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_due_date ON public.maintenance_schedules(due_date);

-- Reload schema cache
SELECT pg_notify('pgrst', 'reload schema');