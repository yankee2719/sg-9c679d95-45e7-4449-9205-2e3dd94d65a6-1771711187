-- ============================================
-- STEP 4: CREATE MAINTENANCE_SCHEDULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_maintenance_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_maintenance_date TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Maintenance schedules are viewable by everyone" ON public.maintenance_schedules
  FOR SELECT USING (true);

CREATE POLICY "Only admins and supervisors can manage schedules" ON public.maintenance_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can update schedules" ON public.maintenance_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can delete schedules" ON public.maintenance_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

SELECT 'Maintenance schedules table created successfully' as status;