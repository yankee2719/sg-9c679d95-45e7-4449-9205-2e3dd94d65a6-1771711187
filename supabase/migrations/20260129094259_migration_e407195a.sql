-- ============================================
-- PHASE 4: RECREATE MAINTENANCE TABLES
-- ============================================

CREATE TABLE public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  last_maintenance_date DATE,
  next_maintenance_date DATE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  maintenance_type TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  issues_found TEXT,
  parts_replaced TEXT[],
  cost DECIMAL(10,2),
  duration_minutes INTEGER,
  photos TEXT[],
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance schedules viewable by authenticated users"
  ON public.maintenance_schedules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and supervisors can manage schedules"
  ON public.maintenance_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Maintenance logs viewable by authenticated users"
  ON public.maintenance_logs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Technicians can create logs"
  ON public.maintenance_logs FOR INSERT
  WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Admins and supervisors can manage logs"
  ON public.maintenance_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

SELECT 'Maintenance tables created' as status;