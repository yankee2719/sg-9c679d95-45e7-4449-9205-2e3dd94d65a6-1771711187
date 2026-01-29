-- STEP 2: Drop ALL foreign key constraints on profiles.id
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey CASCADE;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS fk_profiles_user CASCADE;