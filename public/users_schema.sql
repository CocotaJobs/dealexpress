-- ============================================================
-- DealExpress - Users Schema
-- Generated: 2026-02-19
-- 
-- Este arquivo define a estrutura completa do sistema de usuários:
--   - Enum de roles
--   - Tabela profiles (dados públicos do usuário)
--   - Tabela user_roles (controle de permissões, separada do perfil)
--   - Views seguras
--   - Funções auxiliares (SECURITY DEFINER)
--   - Triggers de onboarding
--   - Políticas RLS
--
-- PRÉ-REQUISITO: A tabela public.organizations deve existir.
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

-- Roles disponíveis na aplicação
-- IMPORTANTE: Roles são armazenadas em tabela separada (user_roles)
-- para evitar privilege escalation via manipulação do perfil.
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');

-- ============================================================
-- TABELAS
-- ============================================================

-- profiles
-- Armazena dados públicos do usuário. O id referencia auth.users
-- (gerenciado internamente), garantindo que cada registro de perfil
-- corresponda a um usuário autenticado.
CREATE TABLE public.profiles (
  id                   UUID        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id      UUID                 REFERENCES public.organizations(id),
  name                 TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  avatar_url           TEXT,
  active               BOOLEAN     NOT NULL DEFAULT true,
  whatsapp_connected   BOOLEAN     NOT NULL DEFAULT false,
  whatsapp_session_id  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles
-- Tabela dedicada para controle de permissões.
-- NUNCA armazene roles diretamente em profiles — isso permitiria
-- que o próprio usuário escalasse seus privilégios via UPDATE no perfil.
-- A unicidade (user_id, role) previne duplicatas.
CREATE TABLE public.user_roles (
  id          UUID            NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id     UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- invitations
-- Gerencia convites para novos usuários se juntarem à organização.
-- O token é único e validado pelo trigger de onboarding.
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

CREATE TABLE public.invitations (
  id               UUID                     NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  organization_id  UUID                     NOT NULL REFERENCES public.organizations(id),
  email            TEXT                     NOT NULL,
  role             public.app_role          NOT NULL DEFAULT 'vendor',
  status           public.invitation_status NOT NULL DEFAULT 'pending',
  token            TEXT                     NOT NULL UNIQUE,
  invited_by       UUID                     REFERENCES auth.users(id),
  expires_at       TIMESTAMPTZ              NOT NULL,
  accepted_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ              NOT NULL DEFAULT now()
);

-- ============================================================
-- VIEWS SEGURAS
-- ============================================================

-- profiles_safe
-- Expõe apenas campos não-sensíveis do perfil para outros usuários
-- da mesma organização. O campo whatsapp_session_id é omitido.
-- security_invoker = on garante que as políticas RLS do usuário
-- atual sejam aplicadas, não as do dono da view.
CREATE OR REPLACE VIEW public.profiles_safe
  WITH (security_invoker = on)
AS
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

-- invitations_safe
-- Omite o token de convite para usuários não-admin.
-- A RLS na tabela base garante que apenas admins vejam registros.
CREATE OR REPLACE VIEW public.invitations_safe
  WITH (security_invoker = on)
AS
  SELECT
    id,
    organization_id,
    email,
    role,
    status,
    invited_by,
    expires_at,
    accepted_at,
    created_at
  FROM public.invitations;

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_organization_id    ON public.profiles(organization_id);
CREATE INDEX idx_user_roles_user_id          ON public.user_roles(user_id);
CREATE INDEX idx_invitations_organization_id ON public.invitations(organization_id);
CREATE INDEX idx_invitations_token           ON public.invitations(token);
CREATE INDEX idx_invitations_email           ON public.invitations(email);

-- ============================================================
-- FUNÇÕES
-- ============================================================

-- handle_updated_at
-- Trigger genérico para atualizar o campo updated_at automaticamente.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- get_user_organization_id
-- Retorna o organization_id do usuário autenticado.
-- SECURITY DEFINER: executa com privilégios do owner (bypassa RLS),
-- garantindo leitura mesmo em contextos restritos.
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- has_role
-- Verifica se um usuário possui determinada role.
-- SECURITY DEFINER: evita recursão em políticas RLS que precisem
-- consultar user_roles sem triggerar outras políticas.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- is_admin
-- Atalho para verificar se o usuário atual é admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- get_own_whatsapp_session
-- Retorna os dados de sessão WhatsApp do usuário autenticado.
-- SECURITY DEFINER: acessa o campo sensível whatsapp_session_id
-- sem expô-lo via RLS pública.
CREATE OR REPLACE FUNCTION public.get_own_whatsapp_session()
RETURNS TABLE(whatsapp_session_id text, whatsapp_connected boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT whatsapp_session_id, whatsapp_connected
  FROM public.profiles WHERE id = auth.uid();
$$;

-- validate_invitation_token
-- Valida um token de convite durante o registro.
-- Chamada via RPC pelo frontend antes de criar o usuário.
CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  org_name text;
BEGIN
  SELECT i.id, i.email, i.role, i.status, i.expires_at, i.organization_id
  INTO invitation_record
  FROM public.invitations i
  WHERE i.token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('isValid', false, 'errorMessage', 'Convite não encontrado ou inválido');
  END IF;

  IF invitation_record.status = 'accepted' THEN
    RETURN json_build_object('isValid', false, 'errorMessage', 'Este convite já foi utilizado');
  END IF;

  IF invitation_record.status = 'expired' OR invitation_record.expires_at < NOW() THEN
    RETURN json_build_object('isValid', false, 'errorMessage', 'Este convite expirou');
  END IF;

  SELECT name INTO org_name FROM public.organizations WHERE id = invitation_record.organization_id;

  RETURN json_build_object(
    'isValid',          true,
    'email',            invitation_record.email,
    'role',             invitation_record.role,
    'organizationName', COALESCE(org_name, ''),
    'expiresAt',        invitation_record.expires_at
  );
END;
$$;

-- handle_new_user
-- Trigger de onboarding: executado após INSERT em auth.users.
-- Fluxo:
--   1. Previne duplicatas de perfil (FOUND check).
--   2. Tenta vincular o novo usuário a uma organização via token de convite.
--   3. Fallback: busca convite pendente pelo e-mail.
--   4. Se nenhum convite encontrado, cria uma nova organização e torna o
--      usuário admin dela.
-- SECURITY DEFINER + SET LOCAL row_security TO off:
--   Necessário para que o trigger possa inserir em profiles/user_roles/
--   organizations sem ser bloqueado por RLS durante o onboarding.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  invitation_record  RECORD;
  invitation_token   TEXT;
  user_name          TEXT;
  new_org_id         UUID;
  existing_profile   UUID;
  invitation_found   BOOLEAN := FALSE;
BEGIN
  -- Bypass RLS localmente para operações de onboarding
  EXECUTE 'SET LOCAL row_security TO off';

  -- 1. Previne criação duplicada de perfil
  SELECT id INTO existing_profile FROM public.profiles WHERE id = NEW.id LIMIT 1;
  IF FOUND THEN RETURN NEW; END IF;

  -- 2. Extrai token de convite dos metadados do usuário
  invitation_token := NULLIF(COALESCE(
    NEW.raw_user_meta_data->>'invitation_token',
    NEW.raw_user_meta_data->>'invite_token',
    NEW.raw_user_meta_data->>'token'
  ), '');

  -- 3. Busca convite pelo token (primário)
  IF invitation_token IS NOT NULL THEN
    SELECT i.* INTO invitation_record
    FROM public.invitations i
    WHERE i.token = invitation_token AND i.status = 'pending' AND i.expires_at > NOW()
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation token'; END IF;
    IF lower(invitation_record.email) <> lower(NEW.email) THEN RAISE EXCEPTION 'Invitation email mismatch'; END IF;
    invitation_found := TRUE;

  ELSE
    -- 4. Fallback: busca convite pendente pelo e-mail
    SELECT i.* INTO invitation_record
    FROM public.invitations i
    WHERE lower(i.email) = lower(NEW.email) AND i.status = 'pending' AND i.expires_at > NOW()
    ORDER BY i.created_at DESC LIMIT 1;

    IF FOUND THEN invitation_found := TRUE; END IF;
  END IF;

  -- Determina o nome do usuário
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF invitation_found THEN
    -- Usuário convidado: vincula à organização e role do convite
    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, invitation_record.organization_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_record.role);

    UPDATE public.invitations SET status = 'accepted', accepted_at = NOW() WHERE id = invitation_record.id;
  ELSE
    -- Registro livre: cria nova organização e torna o usuário admin
    INSERT INTO public.organizations (name)
    VALUES (user_name || '''s Organization')
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, new_org_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Atualiza updated_at automaticamente em profiles
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Executa o onboarding ao criar um novo usuário autenticado
CREATE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- profiles
-- INSERT: bloqueado (gerenciado pelo trigger handle_new_user)
-- SELECT: apenas usuários da mesma organização
-- UPDATE: o próprio usuário pode editar seu perfil; admins podem editar qualquer perfil da org
-- DELETE: bloqueado (controlado via campo active)

CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update profiles in their organization"
  ON public.profiles FOR UPDATE
  USING (is_admin() AND organization_id = get_user_organization_id())
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

-- user_roles
-- INSERT/DELETE: apenas admins, apenas para usuários da mesma organização
-- SELECT: qualquer usuário autenticado pode ver roles da sua organização
-- UPDATE: bloqueado (exclui roles e recria para alterar)

CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles WHERE organization_id = get_user_organization_id()
  ));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    is_admin() AND user_id IN (
      SELECT id FROM public.profiles WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (
    is_admin() AND user_id IN (
      SELECT id FROM public.profiles WHERE organization_id = get_user_organization_id()
    )
  );

-- invitations
-- Apenas admins têm acesso total (CRUD)
-- O token sensível é ocultado na view invitations_safe

CREATE POLICY "Only admins can view invitations"
  ON public.invitations FOR SELECT
  USING (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can update invitations"
  ON public.invitations FOR UPDATE
  USING (is_admin() AND organization_id = get_user_organization_id())
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete invitations"
  ON public.invitations FOR DELETE
  USING (is_admin() AND organization_id = get_user_organization_id());

-- ============================================================
-- ORDEM DE EXECUÇÃO RECOMENDADA
-- ============================================================
-- Se estiver criando o banco do zero, execute na seguinte ordem:
--
--   1. organizations_schema.sql   → CREATE TABLE organizations
--   2. users_schema.sql           → (este arquivo)
--   3. items_schema.sql           → categories + items
--   4. proposals_schema.sql       → proposals + proposal_items
--   5. templates_schema.sql       → templates
--
-- Ou execute database_schema.sql para criar tudo de uma vez.
-- ============================================================
-- FIM DO ARQUIVO
-- ============================================================
