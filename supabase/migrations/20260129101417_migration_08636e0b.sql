-- ============================================
-- STEP 9: CREATE CHECKLIST EXECUTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.checklist_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  maintenance_schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  notes TEXT,
  digital_signature TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.checklist_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checklist executions"
  ON public.checklist_executions
  FOR SELECT
  USING (
    auth.uid() = executed_by OR
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Users can create their own checklist executions"
  ON public.checklist_executions
  FOR INSERT
  WITH CHECK (auth.uid() = executed_by);

CREATE POLICY "Users can update their own checklist executions"
  ON public.checklist_executions
  FOR UPDATE
  USING (auth.uid() = executed_by);

SELECT 'Checklist executions table created successfully' as status;