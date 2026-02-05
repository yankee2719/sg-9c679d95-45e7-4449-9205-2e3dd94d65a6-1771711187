-- STEP 3: Add the correct foreign key constraint with explicit schema reference
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_auth_user_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;