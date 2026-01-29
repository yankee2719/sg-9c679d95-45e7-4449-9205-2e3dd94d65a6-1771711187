-- ============================================
-- STEP 3: CREATE EQUIPMENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  equipment_code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  installation_date DATE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'under_maintenance', 'inactive', 'decommissioned')),
  image_url TEXT,
  qr_code TEXT,
  notes TEXT,
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Equipment is viewable by everyone" ON public.equipment
  FOR SELECT USING (true);

CREATE POLICY "Only admins and supervisors can manage equipment" ON public.equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

SELECT 'Equipment table created successfully' as status;