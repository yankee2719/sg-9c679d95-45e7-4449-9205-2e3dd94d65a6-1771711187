-- ============================================
-- PHASE 7: CREATE EQUIPMENT DOCUMENTS TABLE
-- ============================================

CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents viewable by authenticated users"
  ON public.equipment_documents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage documents"
  ON public.equipment_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

SELECT 'Equipment documents table created' as status;