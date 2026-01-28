-- Drop ALL foreign key constraints on profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey CASCADE;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS fk_profiles_users CASCADE;