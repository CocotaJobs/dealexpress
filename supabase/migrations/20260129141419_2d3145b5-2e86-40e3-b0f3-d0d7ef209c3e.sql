-- =============================================
-- ProposalFlow - Complete Schema with Security
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'vendor');
CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'expired');
CREATE TYPE public.item_type AS ENUM ('product', 'service');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- =============================================
-- TABLES
-- =============================================

-- Organizations (multi-tenant root)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Roles (separate table for security - prevents privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Profiles (extends auth.users with app-specific data)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_connected BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_session_id TEXT,
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories (for organizing items)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items (products and services)
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  technical_specs TEXT,
  type public.item_type NOT NULL DEFAULT 'product',
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  max_discount INTEGER NOT NULL DEFAULT 0 CHECK (max_discount >= 0 AND max_discount <= 100),
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates (Word document templates for proposals)
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proposals
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_whatsapp TEXT,
  client_company TEXT,
  client_address TEXT,
  payment_conditions TEXT,
  validity_days INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMPTZ,
  status public.proposal_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proposal Items (items included in a proposal with snapshot of values)
CREATE TABLE public.proposal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_price DECIMAL(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invitations (for inviting new users to the organization)
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'vendor',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_categories_organization ON public.categories(organization_id);
CREATE INDEX idx_items_organization ON public.items(organization_id);
CREATE INDEX idx_items_category ON public.items(category_id);
CREATE INDEX idx_items_type ON public.items(type);
CREATE INDEX idx_templates_organization ON public.templates(organization_id);
CREATE INDEX idx_proposals_organization ON public.proposals(organization_id);
CREATE INDEX idx_proposals_created_by ON public.proposals(created_by);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_number ON public.proposals(proposal_number);
CREATE INDEX idx_proposal_items_proposal ON public.proposal_items(proposal_id);
CREATE INDEX idx_proposal_items_item ON public.proposal_items(item_id);
CREATE INDEX idx_invitations_organization ON public.invitations(organization_id);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);

-- =============================================
-- TRIGGERS: updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_items
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_proposals
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- TRIGGER: Auto-generate proposal number
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER AS $$
DECLARE
  year_month TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM 'PROP-' || year_month || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.proposals
  WHERE organization_id = NEW.organization_id
    AND proposal_number LIKE 'PROP-' || year_month || '-%';
  
  new_number := 'PROP-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.proposal_number := new_number;
  
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + (NEW.validity_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_proposal_number_trigger
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.generate_proposal_number();

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- =============================================
-- RLS POLICIES: organizations
-- =============================================

CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_user_organization_id());

-- =============================================
-- RLS POLICIES: user_roles
-- =============================================

CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT id FROM public.profiles WHERE organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND user_id IN (
    SELECT id FROM public.profiles WHERE organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin() AND user_id IN (
    SELECT id FROM public.profiles WHERE organization_id = public.get_user_organization_id()
  ));

-- =============================================
-- RLS POLICIES: profiles
-- =============================================

CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update profiles in their organization"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id())
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

-- =============================================
-- RLS POLICIES: categories
-- =============================================

CREATE POLICY "Users can view categories in their organization"
  ON public.categories FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can create categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id())
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id());

-- =============================================
-- RLS POLICIES: items
-- =============================================

CREATE POLICY "Users can view items in their organization"
  ON public.items FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can create items"
  ON public.items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can update items"
  ON public.items FOR UPDATE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id())
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete items"
  ON public.items FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id());

-- =============================================
-- RLS POLICIES: templates
-- =============================================

CREATE POLICY "Users can view templates in their organization"
  ON public.templates FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can create templates"
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can update templates"
  ON public.templates FOR UPDATE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id())
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete templates"
  ON public.templates FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id());

-- =============================================
-- RLS POLICIES: proposals
-- =============================================

CREATE POLICY "Users can view proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid()));

CREATE POLICY "Users can create proposals"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "Users can update proposals"
  ON public.proposals FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid()))
  WITH CHECK (organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid()));

CREATE POLICY "Users can delete proposals"
  ON public.proposals FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND (public.is_admin() OR (created_by = auth.uid() AND status = 'draft')));

-- =============================================
-- RLS POLICIES: proposal_items
-- =============================================

CREATE POLICY "Users can view proposal items"
  ON public.proposal_items FOR SELECT TO authenticated
  USING (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid())
  ));

CREATE POLICY "Users can create proposal items"
  ON public.proposal_items FOR INSERT TO authenticated
  WITH CHECK (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid())
  ));

CREATE POLICY "Users can update proposal items"
  ON public.proposal_items FOR UPDATE TO authenticated
  USING (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid())
  ))
  WITH CHECK (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid())
  ));

CREATE POLICY "Users can delete proposal items"
  ON public.proposal_items FOR DELETE TO authenticated
  USING (proposal_id IN (
    SELECT id FROM public.proposals
    WHERE organization_id = public.get_user_organization_id() AND (public.is_admin() OR created_by = auth.uid())
  ));

-- =============================================
-- RLS POLICIES: invitations
-- =============================================

CREATE POLICY "Users can view invitations in their organization"
  ON public.invitations FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can update invitations"
  ON public.invitations FOR UPDATE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id())
  WITH CHECK (public.is_admin() AND organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete invitations"
  ON public.invitations FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.get_user_organization_id());

-- =============================================
-- AUTH TRIGGER: Handle new user
-- =============================================

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
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF invitation_record IS NOT NULL THEN
    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, invitation_record.organization_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    UPDATE public.invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
  ELSE
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('templates', 'templates', false, 10485760, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']),
  ('product-images', 'product-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('generated-pdfs', 'generated-pdfs', false, 20971520, ARRAY['application/pdf']);

-- =============================================
-- STORAGE POLICIES
-- =============================================

CREATE POLICY "Users can view templates from their organization"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'templates' AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Admins can upload templates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'templates' AND public.is_admin() AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Admins can delete templates storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'templates' AND public.is_admin() AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Users can view product images from their organization"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin() AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin() AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Users can view generated PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generated-pdfs' AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Users can upload generated PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-pdfs' AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "Admins can delete generated PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'generated-pdfs' AND public.is_admin() AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);