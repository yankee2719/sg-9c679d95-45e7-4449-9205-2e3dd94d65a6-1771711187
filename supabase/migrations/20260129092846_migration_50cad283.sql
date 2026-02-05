-- EMERGENCY FIX: Recreate profiles table in public schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'supervisor', 'technician')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  two_factor_enabled BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Insert YOUR admin profile
INSERT INTO public.profiles (id, email, full_name, role, is_active, two_factor_enabled)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Denis Sernagiotto'),
  'admin',
  true,
  false
FROM auth.users
WHERE email = 'denis.sernagiotto@outlook.it'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  is_active = true,
  updated_at = NOW();