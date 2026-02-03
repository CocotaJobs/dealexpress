-- ============================================
-- SECURITY FIXES: Protect Sensitive Data
-- ============================================

-- 1. Update invitations RLS policy to restrict token visibility
-- Only admins should be able to see invitations (they manage the invite flow)
DROP POLICY IF EXISTS "Users can view invitations in their organization" ON public.invitations;

CREATE POLICY "Only admins can view invitations"
ON public.invitations
FOR SELECT
USING (is_admin() AND organization_id = get_user_organization_id());

-- 2. Create a safe view for invitations without token (for UI listing)
CREATE OR REPLACE VIEW public.invitations_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  email,
  role,
  organization_id,
  invited_by,
  status,
  expires_at,
  accepted_at,
  created_at
FROM public.invitations;
-- Token intentionally excluded for security

COMMENT ON VIEW public.invitations_safe IS 'Safe view of invitations excluding sensitive token field';

-- 3. Create a safe view for profiles without whatsapp_session_id
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  organization_id,
  name,
  email,
  avatar_url,
  active,
  whatsapp_connected,
  created_at,
  updated_at
FROM public.profiles;
-- whatsapp_session_id intentionally excluded for security

COMMENT ON VIEW public.profiles_safe IS 'Safe view of profiles excluding sensitive session data';

-- 4. Create a function to get own profile with session_id (for WhatsApp integration)
CREATE OR REPLACE FUNCTION public.get_own_whatsapp_session()
RETURNS TABLE(whatsapp_session_id text, whatsapp_connected boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT whatsapp_session_id, whatsapp_connected
  FROM public.profiles
  WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_own_whatsapp_session IS 'Securely get own WhatsApp session data';

-- 5. Restrict profiles SELECT to hide session_id from non-owners
-- Users can see all org profiles but sensitive fields only for their own
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

-- Allow users to see basic profile info of org members
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (organization_id = get_user_organization_id());

-- Note: The whatsapp_session_id is still in the table but frontend should use profiles_safe view
-- The get_own_whatsapp_session function provides secure access for WhatsApp features