-- STEP 6: CREATE MAINTENANCE_LOGS TABLE
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive', 'inspection')),
  title TEXT NOT NULL,
  description TEXT,
  work_performed TEXT,
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  duration_minutes INTEGER,
  cost DECIMAL(10,2),
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view logs" ON public.maintenance_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert logs" ON public.maintenance_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own logs" ON public.maintenance_logs FOR UPDATE USING (performed_by = auth.uid());
CREATE POLICY "Admins and supervisors can update all logs" ON public.maintenance_logs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins can delete logs" ON public.maintenance_logs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions
GRANT ALL ON public.maintenance_logs TO postgres, anon, authenticated, service_role;

-- Trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.maintenance_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX idx_maintenance_logs_equipment ON public.maintenance_logs(equipment_id);
CREATE INDEX idx_maintenance_logs_performed_by ON public.maintenance_logs(performed_by);
CREATE INDEX idx_maintenance_logs_completed_at ON public.maintenance_logs(completed_at);