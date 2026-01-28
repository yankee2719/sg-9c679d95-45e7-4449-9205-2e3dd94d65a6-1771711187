-- STEP 10: CREATE CHECKLIST_EXECUTION_STEPS TABLE
CREATE TABLE public.checklist_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.checklist_executions(id) ON DELETE CASCADE,
  template_step_id UUID NOT NULL REFERENCES public.checklist_template_steps(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  actual_value TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.checklist_execution_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view execution steps" ON public.checklist_execution_steps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert execution steps" ON public.checklist_execution_steps FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update execution steps" ON public.checklist_execution_steps FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.checklist_executions 
    WHERE id = execution_id AND (executed_by = auth.uid() OR auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'supervisor')
    ))
  )
);
CREATE POLICY "Admins can delete execution steps" ON public.checklist_execution_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions
GRANT ALL ON public.checklist_execution_steps TO postgres, anon, authenticated, service_role;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.checklist_execution_steps
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index
CREATE INDEX idx_checklist_execution_steps_execution ON public.checklist_execution_steps(execution_id);