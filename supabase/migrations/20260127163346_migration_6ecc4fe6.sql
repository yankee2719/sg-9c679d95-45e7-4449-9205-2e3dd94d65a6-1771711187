-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'technician');
CREATE TYPE equipment_status AS ENUM ('active', 'under_maintenance', 'inactive', 'decommissioned');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled');
CREATE TYPE checklist_item_type AS ENUM ('required', 'optional');

-- Extend profiles table with role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'technician';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Two Factor Authentication table
CREATE TABLE two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  secret text NOT NULL,
  is_enabled boolean DEFAULT false,
  backup_codes text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Equipment Categories
CREATE TABLE equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Equipment/Machines
CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id uuid REFERENCES equipment_categories(id) ON DELETE SET NULL,
  model text,
  manufacturer text,
  serial_number text,
  installation_date date,
  status equipment_status DEFAULT 'active',
  location text,
  qr_code text,
  technical_specs jsonb,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES equipment(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  version text,
  tags text[],
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Video Tutorials
CREATE TABLE video_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES equipment(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text NOT NULL,
  description text,
  duration integer,
  tags text[],
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Checklist Templates
CREATE TABLE checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  equipment_category_id uuid REFERENCES equipment_categories(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Checklist Items
CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  item_type checklist_item_type DEFAULT 'required',
  order_index integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Maintenance Schedules
CREATE TABLE maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  checklist_template_id uuid REFERENCES checklist_templates(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_date timestamp with time zone NOT NULL,
  due_date timestamp with time zone,
  priority maintenance_priority DEFAULT 'medium',
  status maintenance_status DEFAULT 'scheduled',
  recurrence_pattern text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Maintenance Logs
CREATE TABLE maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  duration_minutes integer,
  notes text,
  issues_found text,
  parts_replaced text[],
  photo_urls text[],
  status maintenance_status DEFAULT 'in_progress',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Checklist Executions
CREATE TABLE checklist_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_log_id uuid NOT NULL REFERENCES maintenance_logs(id) ON DELETE CASCADE,
  checklist_template_id uuid NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  items_data jsonb NOT NULL,
  digital_signature text,
  completed_at timestamp with time zone,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes text,
  approved boolean,
  created_at timestamp with time zone DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text,
  is_read boolean DEFAULT false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- System Settings
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_equipment_code ON equipment(code);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_maintenance_schedules_status ON maintenance_schedules(status);
CREATE INDEX idx_maintenance_schedules_assigned ON maintenance_schedules(assigned_to);
CREATE INDEX idx_maintenance_schedules_date ON maintenance_schedules(scheduled_date);
CREATE INDEX idx_maintenance_logs_equipment ON maintenance_logs(equipment_id);
CREATE INDEX idx_maintenance_logs_technician ON maintenance_logs(technician_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_profiles_role ON profiles(role);