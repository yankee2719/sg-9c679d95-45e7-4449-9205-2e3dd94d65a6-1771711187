-- STEP 8: CREATE CHECKLIST_TEMPLATE_STEPS TABLE
CREATE TABLE public.checklist_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  expected_value TEXT,
  input_type TEXT NOT NULL DEFAULT 'checkbox' CHECK (input_type IN ('checkbox', 'text', 'number', 'photo', 'signature')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.checklist_template_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view steps" ON public.checklist_template_steps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and supervisors can insert steps" ON public.checklist_template_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins and supervisors can update steps" ON public.checklist_template_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins can delete steps" ON public.checklist_template_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions
GRANT ALL ON public.checklist_template_steps TO postgres, anon, authenticated, service_role;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.checklist_template_steps
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index
CREATE INDEX idx_checklist_template_steps_template ON public.checklist_template_steps(template_id);
CREATE INDEX idx_checklist_template_steps_order ON public.checklist_template_steps(template_id, step_order);