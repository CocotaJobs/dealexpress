-- Drop and recreate profiles_safe view to hide emails from non-admin users
-- The view will show email only for: 1) the user's own row, or 2) if the requester is an admin

DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT
  id,
  organization_id,
  name,
  avatar_url,
  active,
  whatsapp_connected,
  created_at,
  updated_at,
  -- Only show email if: user is viewing their own profile OR user is an admin
  CASE 
    WHEN id = auth.uid() OR is_admin() THEN email
    ELSE NULL
  END as email
FROM public.profiles
WHERE organization_id = get_user_organization_id();

-- Grant access only to authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Revoke access from anon and public roles
REVOKE ALL ON public.profiles_safe FROM anon;
REVOKE ALL ON public.profiles_safe FROM public;

-- Add comment explaining the view purpose
COMMENT ON VIEW public.profiles_safe IS 'Secure view of profiles that hides email addresses from non-admin users and excludes whatsapp_session_id';