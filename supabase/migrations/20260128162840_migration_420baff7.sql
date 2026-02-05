-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new policy: Users can insert their own profile OR admins can insert any profile
CREATE POLICY "Users and admins can insert profiles" ON profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);