-- STEP 11: CREATE EQUIPMENT_DOCUMENTS TABLE
CREATE TABLE public.equipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('manual', 'certificate', 'drawing', 'photo', 'video', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version TEXT DEFAULT '1.0',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view documents" ON public.equipment_documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and supervisors can insert documents" ON public.equipment_documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins and supervisors can update documents" ON public.equipment_documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins can delete documents" ON public.equipment_documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions
GRANT ALL ON public.equipment_documents TO postgres, anon, authenticated, service_role;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.equipment_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index
CREATE INDEX idx_equipment_documents_equipment ON public.equipment_documents(equipment_id);