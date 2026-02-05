-- STEP 3: CREATE EQUIPMENT_CATEGORIES TABLE
CREATE TABLE public.equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Everyone can view, only admins can modify
CREATE POLICY "Anyone can view categories" ON public.equipment_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.equipment_categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update categories" ON public.equipment_categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete categories" ON public.equipment_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions
GRANT ALL ON public.equipment_categories TO postgres, anon, authenticated, service_role;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.equipment_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();