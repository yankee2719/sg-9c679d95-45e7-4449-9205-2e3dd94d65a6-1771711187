-- ============================================
-- PHASE 3: RECREATE EQUIPMENT TABLE
-- ============================================

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  equipment_code TEXT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE,
  category TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  installation_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_maintenance', 'retired')),
  notes TEXT,
  technical_specs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment viewable by authenticated users"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can manage equipment"
  ON public.equipment FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

SELECT 'Equipment table created' as status;