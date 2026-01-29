-- ============================================
-- STEP 8: CREATE CHECKLIST ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  item_text TEXT NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checklist items viewable by authenticated users"
  ON public.checklist_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Checklist items manageable by admin and supervisor"
  ON public.checklist_items
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

SELECT 'Checklist items table created successfully' as status;