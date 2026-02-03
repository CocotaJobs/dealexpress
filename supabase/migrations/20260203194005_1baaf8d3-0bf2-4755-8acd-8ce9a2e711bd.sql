-- Fix invitation onboarding: bind invited signups by *token* (not email)
-- and ensure role/org are taken only from the invitation record.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record RECORD;
  invitation_token TEXT;
  user_name TEXT;
  new_org_id UUID;
BEGIN
  -- Bypass RLS for all operations in this trigger (local to this transaction)
  EXECUTE 'SET LOCAL row_security TO off';

  -- Token must come from user metadata set at signup time
  invitation_token := NULLIF(
    COALESCE(
      NEW.raw_user_meta_data->>'invitation_token',
      NEW.raw_user_meta_data->>'invite_token',
      NEW.raw_user_meta_data->>'token'
    ),
    ''
  );

  IF invitation_token IS NOT NULL THEN
    SELECT i.*
      INTO invitation_record
    FROM public.invitations i
    WHERE i.token = invitation_token
      AND i.status = 'pending'
      AND i.expires_at > NOW()
    LIMIT 1;

    IF invitation_record IS NULL THEN
      -- If a token was provided but is invalid/expired, abort user creation
      RAISE EXCEPTION 'Invalid invitation token';
    END IF;

    -- Defense-in-depth: token must belong to the same email being registered
    IF lower(invitation_record.email) <> lower(NEW.email) THEN
      RAISE EXCEPTION 'Invitation email mismatch';
    END IF;
  ELSE
    invitation_record := NULL;
  END IF;

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF invitation_record IS NOT NULL THEN
    -- Invited user: attach to the invited organization and role
    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, invitation_record.organization_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    UPDATE public.invitations
      SET status = 'accepted',
          accepted_at = NOW()
    WHERE id = invitation_record.id;
  ELSE
    -- Regular signup (no invitation): create a new organization and make user admin
    INSERT INTO public.organizations (name)
    VALUES (user_name || '''s Organization')
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, new_org_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;