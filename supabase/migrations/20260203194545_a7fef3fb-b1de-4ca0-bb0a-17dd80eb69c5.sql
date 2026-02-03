-- =====================================================
-- Security Fix: Restrict all SELECT policies to authenticated users only
-- =====================================================

-- 1. Fix profiles SELECT policy - explicitly require authentication
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- 2. Fix invitations SELECT policy - explicitly require authentication
DROP POLICY IF EXISTS "Only admins can view invitations" ON public.invitations;
CREATE POLICY "Only admins can view invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (is_admin() AND (organization_id = get_user_organization_id()));

-- 3. Reinforce proposals SELECT policy - explicitly require authentication
DROP POLICY IF EXISTS "Users can view proposals" ON public.proposals;
CREATE POLICY "Users can view proposals"
  ON public.proposals
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = get_user_organization_id()) 
    AND (is_admin() OR (created_by = auth.uid()))
  );

-- 4. Ensure invitations_safe view uses security_invoker to inherit RLS
DROP VIEW IF EXISTS public.invitations_safe;
CREATE VIEW public.invitations_safe
WITH (security_invoker = on)
AS SELECT 
  id,
  organization_id,
  email,
  role,
  status,
  expires_at,
  accepted_at,
  created_at,
  invited_by
FROM public.invitations;

-- 5. Revoke any direct access from anon/public to these tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.invitations FROM anon;
REVOKE ALL ON public.proposals FROM anon;
REVOKE ALL ON public.invitations_safe FROM anon;

-- 6. Grant only to authenticated
GRANT SELECT ON public.invitations_safe TO authenticated;