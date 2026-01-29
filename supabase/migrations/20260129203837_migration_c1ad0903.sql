-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can do everything on profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for equipment (all roles can read, admin/supervisor can write)
CREATE POLICY "Anyone can view equipment" ON equipment FOR SELECT USING (true);
CREATE POLICY "Admin/Supervisor can manage equipment" ON equipment FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for maintenance_schedules
CREATE POLICY "Anyone can view schedules" ON maintenance_schedules FOR SELECT USING (true);
CREATE POLICY "Admin/Supervisor can manage schedules" ON maintenance_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for maintenance_logs
CREATE POLICY "Anyone can view logs" ON maintenance_logs FOR SELECT USING (true);
CREATE POLICY "Technicians can create logs" ON maintenance_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can update own logs" ON maintenance_logs FOR UPDATE USING (
  performed_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admin/Supervisor can delete logs" ON maintenance_logs FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for checklists
CREATE POLICY "Anyone can view checklists" ON checklists FOR SELECT USING (true);
CREATE POLICY "Admin/Supervisor can manage checklists" ON checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for checklist_items
CREATE POLICY "Anyone can view checklist items" ON checklist_items FOR SELECT USING (true);
CREATE POLICY "Admin/Supervisor can manage checklist items" ON checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for checklist_executions
CREATE POLICY "Anyone can view executions" ON checklist_executions FOR SELECT USING (true);
CREATE POLICY "Technicians can create executions" ON checklist_executions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can update own executions" ON checklist_executions FOR UPDATE USING (
  executed_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for documents
CREATE POLICY "Anyone can view documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Admin/Supervisor can manage documents" ON documents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);