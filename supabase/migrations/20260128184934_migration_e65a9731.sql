-- Drop and recreate the Database Function without two_factor_enabled field
DROP FUNCTION IF EXISTS create_maintenance_user(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_maintenance_user(
  user_email TEXT,
  user_password TEXT,
  user_full_name TEXT,
  user_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Create user in auth.users with hashed password
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile in profiles table (WITHOUT two_factor_enabled)
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role
  )
  VALUES (
    new_user_id,
    user_email,
    user_full_name,
    user_role
  );

  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', user_email,
    'role', user_role
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION create_maintenance_user TO authenticated;