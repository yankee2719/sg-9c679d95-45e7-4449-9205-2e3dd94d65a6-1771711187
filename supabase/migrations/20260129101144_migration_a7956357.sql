-- ============================================
-- STEP 2: CREATE EQUIPMENT_CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Categories are viewable by everyone" ON public.equipment_categories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" ON public.equipment_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default categories
INSERT INTO public.equipment_categories (name, description) VALUES
  ('Machinery', 'Industrial machinery and equipment'),
  ('Vehicles', 'Forklifts, trucks, and transport vehicles'),
  ('Tools', 'Hand tools and power tools'),
  ('HVAC', 'Heating, ventilation, and air conditioning'),
  ('Electrical', 'Electrical systems and components')
ON CONFLICT (name) DO NOTHING;

SELECT 'Equipment categories created successfully' as status;