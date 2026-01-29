
# Plano de Implementação - Fase 1: Backend e Banco de Dados

## Objetivo
Criar toda a infraestrutura de banco de dados do ProposalFlow no Lovable Cloud (Supabase), incluindo tabelas, funções de segurança, políticas RLS e storage buckets.

## Arquivos a Criar

### 1. Migration Principal - Schema Base
**Arquivo:** `supabase/migrations/20250129000001_create_base_schema.sql`

Conteúdo:
- **Enums:** `app_role` (admin/vendor), `proposal_status` (draft/sent/expired), `item_type` (product/service), `invitation_status` (pending/accepted/expired)
- **Tabelas:** organizations, user_roles, profiles, categories, items, templates, proposals, proposal_items, invitations
- **Índices:** para performance em buscas frequentes
- **Triggers:** updated_at automático, geração de número de proposta

### 2. Migration de Segurança - Helper Functions e RLS
**Arquivo:** `supabase/migrations/20250129000002_security_policies.sql`

Conteúdo:
- **Função `get_user_organization_id()`:** retorna o organization_id do usuário atual
- **Função `has_role(role)`:** verifica se usuário tem determinada role (SECURITY DEFINER para evitar recursão)
- **Políticas RLS:** para cada tabela com regras específicas:
  - `organizations`: SELECT para membros
  - `profiles`: SELECT para membros, UPDATE para admin ou próprio usuário
  - `user_roles`: SELECT para membros
  - `categories`: CRUD para admin, SELECT para vendor
  - `items`: CRUD para admin, SELECT para vendor
  - `templates`: CRUD para admin, SELECT para vendor
  - `proposals`: Admin vê todas da org, vendor só as próprias
  - `proposal_items`: acesso baseado na proposta pai
  - `invitations`: admin pode gerenciar

### 3. Migration de Storage
**Arquivo:** `supabase/migrations/20250129000003_storage_buckets.sql`

Conteúdo:
- **Bucket `templates`:** para arquivos .docx (privado)
- **Bucket `product-images`:** para imagens de produtos (privado)
- **Bucket `generated-pdfs`:** para PDFs gerados (privado)
- **Políticas de acesso:** baseadas na organização do usuário

### 4. Trigger para Novo Usuário
**Arquivo:** `supabase/migrations/20250129000004_auth_trigger.sql`

Conteúdo:
- Função que cria profile automaticamente quando usuário se registra via convite
- Associa usuário à organização do convite
- Atribui role definida no convite

## Estrutura das Tabelas

```text
organizations
├── id (UUID, PK)
├── name (TEXT)
├── created_at
└── updated_at

profiles
├── id (UUID, PK, FK → auth.users)
├── organization_id (FK → organizations)
├── name (TEXT)
├── email (TEXT)
├── whatsapp_connected (BOOLEAN)
├── whatsapp_session_id (TEXT)
├── avatar_url (TEXT)
├── active (BOOLEAN)
├── created_at
└── updated_at

user_roles
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── role (app_role)
├── created_at
└── UNIQUE(user_id, role)

categories
├── id (UUID, PK)
├── organization_id (FK → organizations)
├── name (TEXT)
├── active (BOOLEAN)
├── created_at
└── updated_at

items
├── id (UUID, PK)
├── organization_id (FK → organizations)
├── category_id (FK → categories)
├── name (TEXT)
├── description (TEXT)
├── technical_specs (TEXT)
├── type (item_type)
├── price (DECIMAL)
├── max_discount (INTEGER 0-100)
├── image_url (TEXT)
├── active (BOOLEAN)
├── created_at
└── updated_at

proposals
├── id (UUID, PK)
├── organization_id (FK → organizations)
├── proposal_number (TEXT, auto-generated)
├── created_by (FK → profiles)
├── client_name (TEXT)
├── client_email (TEXT)
├── client_whatsapp (TEXT)
├── client_company (TEXT)
├── client_address (TEXT)
├── payment_conditions (TEXT)
├── validity_days (INTEGER)
├── expires_at (TIMESTAMPTZ)
├── status (proposal_status)
├── sent_at (TIMESTAMPTZ)
├── pdf_url (TEXT)
├── created_at
└── updated_at

proposal_items
├── id (UUID, PK)
├── proposal_id (FK → proposals)
├── item_id (FK → items)
├── item_name (TEXT snapshot)
├── item_price (DECIMAL snapshot)
├── quantity (INTEGER)
├── discount (DECIMAL)
├── subtotal (DECIMAL)
└── created_at

templates
├── id (UUID, PK)
├── organization_id (FK → organizations)
├── name (TEXT)
├── file_path (TEXT)
├── is_active (BOOLEAN)
├── uploaded_by (FK → profiles)
├── created_at
└── updated_at

invitations
├── id (UUID, PK)
├── organization_id (FK → organizations)
├── email (TEXT)
├── role (app_role)
├── invited_by (FK → profiles)
├── token (TEXT, unique)
├── status (invitation_status)
├── expires_at (TIMESTAMPTZ)
├── accepted_at (TIMESTAMPTZ)
└── created_at
```

## Funções de Segurança

```sql
-- Retorna organization_id do usuário atual
get_user_organization_id() → UUID

-- Verifica se usuário tem determinada role (SECURITY DEFINER)
has_role(_user_id UUID, _role app_role) → BOOLEAN
```

## Regras de Segurança (RLS)

| Tabela | Admin | Vendor |
|--------|-------|--------|
| organizations | SELECT | SELECT |
| profiles | SELECT, UPDATE | SELECT próprio |
| user_roles | SELECT | SELECT |
| categories | CRUD | SELECT |
| items | CRUD | SELECT |
| templates | CRUD | SELECT |
| proposals | CRUD todas da org | CRUD próprias |
| proposal_items | CRUD | CRUD próprias |
| invitations | CRUD | SELECT |

## Atualização do Cliente Supabase
**Arquivo:** `src/integrations/supabase/types.ts`

Será atualizado automaticamente com os tipos das novas tabelas.

## Próximos Passos Após Esta Fase
1. Atualizar AuthContext para usar Supabase Auth real
2. Criar hooks para cada entidade (useItems, useProposals, etc.)
3. Conectar páginas existentes ao banco de dados

