-- STEP 1: Drop the problematic constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_auth_user_fkey CASCADE;