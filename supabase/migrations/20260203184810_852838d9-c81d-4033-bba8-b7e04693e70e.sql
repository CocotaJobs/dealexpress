-- Create a secure RPC function to validate invitation tokens
-- This prevents exposing organization details to unauthenticated users with stolen tokens

CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  org_name text;
  result json;
BEGIN
  -- Find the invitation by token
  SELECT 
    i.id,
    i.email,
    i.role,
    i.status,
    i.expires_at,
    i.organization_id
  INTO invitation_record
  FROM public.invitations i
  WHERE i.token = _token
  LIMIT 1;

  -- Token not found
  IF invitation_record IS NULL THEN
    RETURN json_build_object(
      'isValid', false,
      'errorMessage', 'Convite não encontrado ou inválido'
    );
  END IF;

  -- Check if already used
  IF invitation_record.status = 'accepted' THEN
    RETURN json_build_object(
      'isValid', false,
      'errorMessage', 'Este convite já foi utilizado'
    );
  END IF;

  -- Check if expired by status
  IF invitation_record.status = 'expired' THEN
    RETURN json_build_object(
      'isValid', false,
      'errorMessage', 'Este convite expirou'
    );
  END IF;

  -- Check if expired by date
  IF invitation_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'isValid', false,
      'errorMessage', 'Este convite expirou'
    );
  END IF;

  -- Get organization name
  SELECT name INTO org_name
  FROM public.organizations
  WHERE id = invitation_record.organization_id;

  -- Return valid invitation info
  RETURN json_build_object(
    'isValid', true,
    'email', invitation_record.email,
    'role', invitation_record.role,
    'organizationName', COALESCE(org_name, ''),
    'expiresAt', invitation_record.expires_at
  );
END;
$$;

-- Grant execute permission to anon (needed for unauthenticated registration flow)
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO authenticated;