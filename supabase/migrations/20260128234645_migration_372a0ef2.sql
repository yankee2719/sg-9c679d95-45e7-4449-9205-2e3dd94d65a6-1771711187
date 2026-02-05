-- STEP 5: CREATE MAINTENANCE_SCHEDULES TABLE
CREATE TABLE public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive', 'inspection')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_duration INTEGER, -- minutes
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view schedules" ON public.maintenance_schedules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and supervisors can insert schedules" ON public.maintenance_schedules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins and supervisors can update schedules" ON public.maintenance_schedules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Assigned technicians can update their schedules" ON public.maintenance_schedules FOR UPDATE USING (assigned_to = auth.uid());
CREATE POLICY "Admins can delete schedules" ON public.maintenance_schedules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions
GRANT ALL ON public.maintenance_schedules TO postgres, anon, authenticated, service_role;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.maintenance_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX idx_maintenance_schedules_equipment ON public.maintenance_schedules(equipment_id);
CREATE INDEX idx_maintenance_schedules_assigned_to ON public.maintenance_schedules(assigned_to);
CREATE INDEX idx_maintenance_schedules_scheduled_date ON public.maintenance_schedules(scheduled_date);
CREATE INDEX idx_maintenance_schedules_status ON public.maintenance_schedules(status);