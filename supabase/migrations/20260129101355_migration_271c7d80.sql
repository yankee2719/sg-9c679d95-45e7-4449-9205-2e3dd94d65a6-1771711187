-- ============================================
-- STEP 7: CREATE CHECKLIST TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  equipment_category_id UUID REFERENCES public.equipment_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checklist templates viewable by authenticated users"
  ON public.checklist_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Checklist templates manageable by admin and supervisor"
  ON public.checklist_templates
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_checklist_templates
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

SELECT 'Checklist templates table created successfully' as status;