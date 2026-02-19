-- ============================================================
-- DealExpress - Database Schema
-- Generated: 2026-02-19
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');
CREATE TYPE public.item_type AS ENUM ('product', 'service');
CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'expired');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. organizations
CREATE TABLE public.organizations (
  id                UUID        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name              TEXT        NOT NULL,
  default_shipping  TEXT                 DEFAULT 'A combinar',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles
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

-- 3. user_roles
CREATE TABLE public.user_roles (
  id          UUID        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  role        public.app_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. invitations
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

-- 5. categories
CREATE TABLE public.categories (
  id               UUID        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id),
  name             TEXT        NOT NULL,
  active           BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. items
CREATE TABLE public.items (
  id               UUID              NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  organization_id  UUID              NOT NULL REFERENCES public.organizations(id),
  category_id      UUID                       REFERENCES public.categories(id),
  name             TEXT              NOT NULL,
  description      TEXT,
  technical_specs  TEXT,
  image_url        TEXT,
  type             public.item_type  NOT NULL DEFAULT 'product',
  price            NUMERIC           NOT NULL DEFAULT 0,
  max_discount     INTEGER           NOT NULL DEFAULT 0,
  active           BOOLEAN           NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- 7. templates
CREATE TABLE public.templates (
  id               UUID        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id),
  name             TEXT        NOT NULL,
  file_path        TEXT        NOT NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  uploaded_by      UUID                 REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. proposals
CREATE TABLE public.proposals (
  id                  UUID                     NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  organization_id     UUID                     NOT NULL REFERENCES public.organizations(id),
  created_by          UUID                     NOT NULL REFERENCES auth.users(id),
  proposal_number     TEXT                     NOT NULL,
  client_name         TEXT                     NOT NULL,
  client_email        TEXT,
  client_whatsapp     TEXT,
  client_company      TEXT,
  client_cnpj         TEXT,
  client_address      TEXT,
  shipping            TEXT,
  payment_conditions  TEXT,
  validity_days       INTEGER                  NOT NULL DEFAULT 30,
  expires_at          TIMESTAMPTZ,
  status              public.proposal_status   NOT NULL DEFAULT 'draft',
  pdf_url             TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ              NOT NULL DEFAULT now()
);

-- 9. proposal_items
CREATE TABLE public.proposal_items (
  id             UUID        NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  proposal_id    UUID        NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_id        UUID                 REFERENCES public.items(id),
  item_name      TEXT        NOT NULL,
  item_price     NUMERIC     NOT NULL,
  quantity       INTEGER     NOT NULL DEFAULT 1,
  discount       NUMERIC     NOT NULL DEFAULT 0,
  discount_type  TEXT        NOT NULL DEFAULT 'percentage',
  subtotal       NUMERIC     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VIEWS
-- ============================================================

-- profiles_safe: hides sensitive fields from non-owner users
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

-- invitations_safe: hides token from non-admin users
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
-- INDEXES
-- ============================================================

CREATE INDEX idx_profiles_organization_id      ON public.profiles(organization_id);
CREATE INDEX idx_user_roles_user_id            ON public.user_roles(user_id);
CREATE INDEX idx_invitations_organization_id   ON public.invitations(organization_id);
CREATE INDEX idx_invitations_token             ON public.invitations(token);
CREATE INDEX idx_invitations_email             ON public.invitations(email);
CREATE INDEX idx_categories_organization_id    ON public.categories(organization_id);
CREATE INDEX idx_items_organization_id         ON public.items(organization_id);
CREATE INDEX idx_items_category_id             ON public.items(category_id);
CREATE INDEX idx_templates_organization_id     ON public.templates(organization_id);
CREATE INDEX idx_proposals_organization_id     ON public.proposals(organization_id);
CREATE INDEX idx_proposals_created_by          ON public.proposals(created_by);
CREATE INDEX idx_proposal_items_proposal_id    ON public.proposal_items(proposal_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Get organization id of current user
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- Get WhatsApp session of current user
CREATE OR REPLACE FUNCTION public.get_own_whatsapp_session()
RETURNS TABLE(whatsapp_session_id text, whatsapp_connected boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT whatsapp_session_id, whatsapp_connected
  FROM public.profiles WHERE id = auth.uid();
$$;

-- Validate an invitation token (used during registration)
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

-- Auto-generate proposal number and set expiry
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  year_month TEXT;
  seq_num    INTEGER;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM 'PROP-' || year_month || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.proposals
  WHERE organization_id = NEW.organization_id
    AND proposal_number LIKE 'PROP-' || year_month || '-%';

  NEW.proposal_number := 'PROP-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + (NEW.validity_days || ' days')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$;

-- Handle new user registration (links to org via invitation or creates new org)
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
  EXECUTE 'SET LOCAL row_security TO off';

  SELECT id INTO existing_profile FROM public.profiles WHERE id = NEW.id LIMIT 1;
  IF FOUND THEN RETURN NEW; END IF;

  invitation_token := NULLIF(COALESCE(
    NEW.raw_user_meta_data->>'invitation_token',
    NEW.raw_user_meta_data->>'invite_token',
    NEW.raw_user_meta_data->>'token'
  ), '');

  IF invitation_token IS NOT NULL THEN
    SELECT i.* INTO invitation_record
    FROM public.invitations i
    WHERE i.token = invitation_token AND i.status = 'pending' AND i.expires_at > NOW()
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation token'; END IF;
    IF lower(invitation_record.email) <> lower(NEW.email) THEN RAISE EXCEPTION 'Invitation email mismatch'; END IF;
    invitation_found := TRUE;
  ELSE
    SELECT i.* INTO invitation_record
    FROM public.invitations i
    WHERE lower(i.email) = lower(NEW.email) AND i.status = 'pending' AND i.expires_at > NOW()
    ORDER BY i.created_at DESC LIMIT 1;

    IF FOUND THEN invitation_found := TRUE; END IF;
  END IF;

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF invitation_found THEN
    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, invitation_record.organization_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invitation_record.role);

    UPDATE public.invitations SET status = 'accepted', accepted_at = NOW() WHERE id = invitation_record.id;
  ELSE
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

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_proposals_number
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.generate_proposal_number();

CREATE TRIGGER trg_auth_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items   ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (id = get_user_organization_id());

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (is_admin() AND id = get_user_organization_id())
  WITH CHECK (is_admin() AND id = get_user_organization_id());

-- profiles
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update profiles in their organization"
  ON public.profiles FOR UPDATE
  USING (is_admin() AND organization_id = get_user_organization_id())
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

-- user_roles
CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE organization_id = get_user_organization_id()));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (is_admin() AND user_id IN (SELECT id FROM public.profiles WHERE organization_id = get_user_organization_id()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (is_admin() AND user_id IN (SELECT id FROM public.profiles WHERE organization_id = get_user_organization_id()));

-- invitations
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

-- categories
CREATE POLICY "Users can view categories in their organization"
  ON public.categories FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can create categories"
  ON public.categories FOR INSERT
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (is_admin() AND organization_id = get_user_organization_id())
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (is_admin() AND organization_id = get_user_organization_id());

-- items
CREATE POLICY "Users can view items in their organization"
  ON public.items FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can create items"
  ON public.items FOR INSERT
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can update items"
  ON public.items FOR UPDATE
  USING (is_admin() AND organization_id = get_user_organization_id())
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete items"
  ON public.items FOR DELETE
  USING (is_admin() AND organization_id = get_user_organization_id());

-- templates
CREATE POLICY "Users can view templates in their organization"
  ON public.templates FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can create templates"
  ON public.templates FOR INSERT
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can update templates"
  ON public.templates FOR UPDATE
  USING (is_admin() AND organization_id = get_user_organization_id())
  WITH CHECK (is_admin() AND organization_id = get_user_organization_id());

CREATE POLICY "Admins can delete templates"
  ON public.templates FOR DELETE
  USING (is_admin() AND organization_id = get_user_organization_id());

-- proposals
CREATE POLICY "Users can view proposals"
  ON public.proposals FOR SELECT
  USING (organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid()));

CREATE POLICY "Users can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "Users can update proposals"
  ON public.proposals FOR UPDATE
  USING (organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid()))
  WITH CHECK (organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid()));

CREATE POLICY "Users can delete proposals"
  ON public.proposals FOR DELETE
  USING (organization_id = get_user_organization_id() AND (is_admin() OR (created_by = auth.uid() AND status = 'draft')));

-- proposal_items
CREATE POLICY "Users can view proposal items"
  ON public.proposal_items FOR SELECT
  USING (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid())
  ));

CREATE POLICY "Users can create proposal items"
  ON public.proposal_items FOR INSERT
  WITH CHECK (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid())
  ));

CREATE POLICY "Users can update proposal items"
  ON public.proposal_items FOR UPDATE
  USING (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid())
  ))
  WITH CHECK (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid())
  ));

CREATE POLICY "Users can delete proposal items"
  ON public.proposal_items FOR DELETE
  USING (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = get_user_organization_id() AND (is_admin() OR created_by = auth.uid())
  ));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('templates',       'templates',       false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images',  'product-images',  false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-pdfs',  'generated-pdfs',  false) ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
