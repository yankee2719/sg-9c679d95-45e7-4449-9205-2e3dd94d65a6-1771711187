-- Enable RLS on two_factor_auth table
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own 2FA settings
CREATE POLICY "Users can view their own 2FA settings"
ON two_factor_auth
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- Policy: Users can insert their own 2FA settings
CREATE POLICY "Users can insert their own 2FA settings"
ON two_factor_auth
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own 2FA settings
CREATE POLICY "Users can update their own 2FA settings"
ON two_factor_auth
FOR UPDATE
TO public
USING (auth.uid() = user_id);

-- Policy: Users can delete their own 2FA settings
CREATE POLICY "Users can delete their own 2FA settings"
ON two_factor_auth
FOR DELETE
TO public
USING (auth.uid() = user_id);