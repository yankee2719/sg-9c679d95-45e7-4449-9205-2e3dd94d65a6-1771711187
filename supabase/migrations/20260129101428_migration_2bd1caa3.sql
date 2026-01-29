-- ============================================
-- STEP 10: CREATE CHECKLIST EXECUTION ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.checklist_execution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.checklist_executions(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  photo_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.checklist_execution_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view execution items for their executions"
  ON public.checklist_execution_items
  FOR SELECT
  USING (
    execution_id IN (
      SELECT id FROM public.checklist_executions 
      WHERE executed_by = auth.uid()
    ) OR
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Users can manage execution items for their executions"
  ON public.checklist_execution_items
  FOR ALL
  USING (
    execution_id IN (
      SELECT id FROM public.checklist_executions 
      WHERE executed_by = auth.uid()
    )
  );

SELECT 'Checklist execution items table created successfully' as status;