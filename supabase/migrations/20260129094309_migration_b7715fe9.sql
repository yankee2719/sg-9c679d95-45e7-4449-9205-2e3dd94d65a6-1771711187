-- ============================================
-- PHASE 5: RECREATE CHECKLIST TABLES
-- ============================================

CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  equipment_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT false,
  requires_photo BOOLEAN DEFAULT false,
  requires_note BOOLEAN DEFAULT false,
  expected_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.checklist_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  executed_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.checklist_execution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.checklist_executions(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.checklist_template_items(id),
  is_completed BOOLEAN DEFAULT false,
  actual_value TEXT,
  notes TEXT,
  photo_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_execution_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates viewable by authenticated users"
  ON public.checklist_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.checklist_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Template items viewable by authenticated users"
  ON public.checklist_template_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage template items"
  ON public.checklist_template_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Executions viewable by authenticated users"
  ON public.checklist_executions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Technicians can create executions"
  ON public.checklist_executions FOR INSERT
  WITH CHECK (auth.uid() = executed_by);

CREATE POLICY "Users can update their own executions"
  ON public.checklist_executions FOR UPDATE
  USING (auth.uid() = executed_by);

CREATE POLICY "Execution items viewable by authenticated users"
  ON public.checklist_execution_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can manage execution items"
  ON public.checklist_execution_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.checklist_executions
      WHERE id = execution_id AND executed_by = auth.uid()
    )
  );

SELECT 'Checklist tables created' as status;