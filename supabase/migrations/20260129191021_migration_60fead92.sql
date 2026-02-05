-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create new policy that allows:
-- 1. First user creation (when no profiles exist)
-- 2. Admins can create any profile
-- 3. Users can create their own profile
CREATE POLICY "Allow profile creation" ON profiles
FOR INSERT
WITH CHECK (
  -- Allow if no profiles exist yet (first user)
  (NOT EXISTS (SELECT 1 FROM profiles))
  -- OR user is creating their own profile
  OR (auth.uid() = id)
  -- OR user is an admin
  OR (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ))
);