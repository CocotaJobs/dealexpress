

# Plano de Correção de Segurança

## Resumo dos Problemas Identificados

Existem **3 erros de segurança de nível "error"** que precisam ser corrigidos:

1. **profiles_table_public_exposure**: A tabela `profiles` está acessível a usuários não autenticados porque a política SELECT tem `roles:{public}` em vez de `{authenticated}`.

2. **invitations_safe_missing_rls**: A view `invitations_safe` não tem políticas RLS próprias e a tabela base `invitations` tem a mesma vulnerabilidade com `roles:{public}`.

3. **proposals_table_public_exposure**: A tabela `proposals` tem políticas RLS, mas a SELECT policy também precisa ter `roles:{authenticated}` para garantir que usuários anônimos não possam consultá-la.

---

## Solução Proposta

### Parte 1: Correção das Políticas RLS no Banco de Dados

Vou criar uma migração SQL que:

1. **Recria as políticas SELECT** das tabelas `profiles`, `invitations` e `proposals` com `TO authenticated` explicitamente, garantindo que somente usuários autenticados possam ler dados.

2. **Remove o acesso a `anon`** de todas as tabelas sensíveis.

```text
+------------------+     +------------------+     +------------------+
|    profiles      |     |   invitations    |     |    proposals     |
+------------------+     +------------------+     +------------------+
| SELECT: public   | --> | SELECT: public   | --> | SELECT: auth     |
| (VULNERÁVEL!)    |     | (VULNERÁVEL!)    |     | (OK, mas reforçar|
+------------------+     +------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
| SELECT: auth     |     | SELECT: auth     |     | SELECT: auth     |
| (CORRIGIDO)      |     | (CORRIGIDO)      |     | (REFORÇADO)      |
+------------------+     +------------------+     +------------------+
```

### Parte 2: Atualização do Código Frontend

1. **AuthContext.tsx**: Atualizar para buscar dados do usuário usando a RPC `get_own_whatsapp_session()` para dados sensíveis de WhatsApp, e a view `profiles_safe` para dados básicos do perfil (mas mantendo a tabela `profiles` para o próprio usuário já que RLS permite).

2. **useProposals.ts**: Continuar buscando nome do vendedor da tabela `profiles` (já que é apenas `id, name` e RLS permite para a organização).

3. **ViewProposal.tsx**: Mesmo caso - já busca apenas `id, name`.

4. **useDashboardMetrics.ts**: Verificar se está buscando apenas contagens.

---

## Detalhes Técnicos

### Migração SQL

```sql
-- 1. Fix profiles SELECT policy - change from public to authenticated
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

-- 2. Fix invitations SELECT policy - change from public to authenticated  
DROP POLICY IF EXISTS "Only admins can view invitations" ON public.invitations;
CREATE POLICY "Only admins can view invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (is_admin() AND (organization_id = get_user_organization_id()));

-- 3. Reinforce proposals policies (already authenticated but let's be explicit)
DROP POLICY IF EXISTS "Users can view proposals" ON public.proposals;
CREATE POLICY "Users can view proposals"
  ON public.proposals
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = get_user_organization_id()) 
    AND (is_admin() OR (created_by = auth.uid()))
  );
```

### Modificação do AuthContext.tsx

O código atual busca `whatsapp_session_id` diretamente:

```typescript
// ANTES (vulnerável)
const { data: profileData } = await supabase
  .from('profiles')
  .select('*')  // Inclui whatsapp_session_id!
  .eq('id', userId)
```

Vou modificar para buscar apenas os campos necessários e usar a RPC para dados sensíveis de WhatsApp:

```typescript
// DEPOIS (seguro)
const { data: profileData } = await supabase
  .from('profiles')
  .select('id, email, name, organization_id, whatsapp_connected, avatar_url, created_at')
  .eq('id', userId)
```

Nota: O `whatsapp_session_id` não é usado no frontend (apenas nas Edge Functions), então pode ser removido do UserProfile interface.

---

## Arquivos a Modificar

1. **Nova migração SQL** - Corrigir políticas RLS
2. **src/contexts/AuthContext.tsx** - Remover busca de `whatsapp_session_id`

---

## Validação

Após implementação:
- Usuários não autenticados não poderão consultar nenhuma tabela
- A view `invitations_safe` herdará as políticas da tabela base (que agora exige autenticação)
- O campo `whatsapp_session_id` não será mais exposto no frontend
- Todas as funcionalidades continuarão funcionando normalmente

