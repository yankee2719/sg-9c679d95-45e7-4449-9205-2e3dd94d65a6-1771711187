-- Add missing avatar_url column to profiles
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;