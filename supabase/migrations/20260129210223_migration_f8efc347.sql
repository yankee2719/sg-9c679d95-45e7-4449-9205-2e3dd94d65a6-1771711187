-- PHASE 3: ROW LEVEL SECURITY (RLS) POLICIES

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

-- PROFILES policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- EQUIPMENT policies
CREATE POLICY "Everyone can view equipment" ON equipment FOR SELECT USING (true);
CREATE POLICY "Admins and supervisors can manage equipment" ON equipment FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Technicians can update equipment" ON equipment FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'technician')
);

-- MAINTENANCE SCHEDULES policies
CREATE POLICY "Everyone can view maintenance schedules" ON maintenance_schedules FOR SELECT USING (true);
CREATE POLICY "Admins and supervisors can manage schedules" ON maintenance_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- MAINTENANCE LOGS policies
CREATE POLICY "Everyone can view maintenance logs" ON maintenance_logs FOR SELECT USING (true);
CREATE POLICY "Users can create logs" ON maintenance_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can update own logs" ON maintenance_logs FOR UPDATE USING (
  performed_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);
CREATE POLICY "Admins and supervisors can delete logs" ON maintenance_logs FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- CHECKLISTS policies
CREATE POLICY "Everyone can view checklists" ON checklists FOR SELECT USING (true);
CREATE POLICY "Admins and supervisors can manage checklists" ON checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- CHECKLIST ITEMS policies
CREATE POLICY "Everyone can view checklist items" ON checklist_items FOR SELECT USING (true);
CREATE POLICY "Admins and supervisors can manage checklist items" ON checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- CHECKLIST EXECUTIONS policies
CREATE POLICY "Everyone can view checklist executions" ON checklist_executions FOR SELECT USING (true);
CREATE POLICY "Users can create executions" ON checklist_executions FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Users can update own executions" ON checklist_executions FOR UPDATE USING (
  executed_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- DOCUMENTS policies
CREATE POLICY "Everyone can view documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Users can upload documents" ON documents FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "Admins can manage all documents" ON documents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all notifications" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);