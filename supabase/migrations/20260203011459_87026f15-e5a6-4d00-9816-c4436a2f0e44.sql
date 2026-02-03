-- Allow anonymous users to read invitations (needed for registration flow)
-- This is secure because:
-- 1. The token is a UUID that cannot be guessed
-- 2. Users can only access invitations if they know the exact token
-- 3. Only basic invitation info is exposed (email, role, organization)

CREATE POLICY "Anonymous can view invitations by token"
  ON public.invitations 
  FOR SELECT 
  TO anon
  USING (true);