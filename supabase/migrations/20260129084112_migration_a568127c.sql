-- Create simple, non-circular policies
-- Policy 1: Everyone can read their own profile (NO admin check!)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO public
USING (auth.uid() = id);

-- Policy 2: Everyone can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Service role can do everything (for scripts/admin operations)
CREATE POLICY "Service role full access"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);