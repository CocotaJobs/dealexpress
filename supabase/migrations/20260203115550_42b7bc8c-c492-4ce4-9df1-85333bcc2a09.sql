-- 1. Atualizar o trigger handle_new_user para bypassar RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  user_name TEXT;
  new_org_id UUID;
BEGIN
  -- Bypassar RLS para buscar convite pendente
  EXECUTE 'SET LOCAL row_security TO off';
  
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Restaurar row security
  EXECUTE 'SET LOCAL row_security TO on';

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF invitation_record IS NOT NULL THEN
    -- Usuário convidado: vincular à organização do convite
    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, invitation_record.organization_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    -- Marcar convite como aceito
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
  ELSE
    -- Novo usuário sem convite: criar organização própria
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

-- 2. Corrigir o profile do usuário afetado
UPDATE profiles 
SET organization_id = '9940b4bb-3ffb-424f-9e92-149ec008d423'
WHERE email = 'joao@jvfmaquinas.com.br';

-- 3. Corrigir o role para vendor
UPDATE user_roles 
SET role = 'vendor'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'joao@jvfmaquinas.com.br');

-- 4. Marcar o convite como aceito
UPDATE invitations 
SET status = 'accepted', accepted_at = NOW()
WHERE email = 'joao@jvfmaquinas.com.br' AND status = 'pending';

-- 5. Remover a organização órfã
DELETE FROM organizations 
WHERE id = '33240eac-b5ec-4eb5-910d-ccc224773cdd';