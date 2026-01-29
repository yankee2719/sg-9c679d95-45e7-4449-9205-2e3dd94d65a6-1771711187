-- STEP 3: Add a more permissive SELECT policy for users to read their own profile
-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a simple policy: users can always read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Verify the user can now read their profile
SELECT 
  id,
  email,
  full_name,
  role,
  is_active
FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'denis.sernagiotto@outlook.it');