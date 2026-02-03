-- Fix: Enable RLS on invitations_safe view
-- The view was created with security_invoker=on, so it inherits policies from 
-- the base invitations table. However, views also need RLS explicitly enabled.

-- First, let's check if the view exists and recreate it with proper security
DROP VIEW IF EXISTS public.invitations_safe;

-- Recreate the view with security_invoker to inherit RLS from base table
CREATE VIEW public.invitations_safe
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
-- Token is intentionally excluded for security

-- Grant appropriate permissions (the RLS from invitations table will apply)
GRANT SELECT ON public.invitations_safe TO authenticated;

-- Revoke public/anon access to ensure only authenticated users can query
REVOKE ALL ON public.invitations_safe FROM anon;
REVOKE ALL ON public.invitations_safe FROM public;