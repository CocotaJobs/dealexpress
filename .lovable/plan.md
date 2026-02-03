
## Plano: Implementar Gestão de Equipes com Hierarquia

### Análise da Situação Atual

A estrutura de banco de dados já está bem configurada com:

| Componente | Status | Descrição |
|------------|--------|-----------|
| `organizations` | Pronto | Multi-tenant para separar dados por empresa |
| `user_roles` | Pronto | Tabela separada para roles (admin/vendor) |
| `invitations` | Pronto | Sistema de convites com token, expiração e status |
| `profiles` | Pronto | Dados de perfil com organization_id |
| RLS Policies | Pronto | Políticas de segurança por organização e role |
| Trigger de registro | Pronto | Processa convites automaticamente |

**Problema identificado**: A página `Users.tsx` usa **dados mock** e não está conectada ao banco de dados real.

---

### Escopo da Implementação

#### Fase 1: Conectar Users.tsx ao Banco de Dados

1. **Criar hook `useUsers.ts`**
   - Buscar usuários da organização (profiles + roles)
   - Funções para ativar/desativar usuários
   - Função para alterar role do usuário

2. **Criar hook `useInvitations.ts`**
   - Buscar convites pendentes da organização
   - Criar novo convite com token único
   - Reenviar convite
   - Cancelar convite

3. **Atualizar `Users.tsx`**
   - Remover dados mock
   - Integrar com os hooks reais
   - Mostrar contagem real de propostas por usuário

#### Fase 2: Sistema de Convites Funcional

1. **Criar Edge Function `send-invitation`**
   - Gerar token único para convite
   - Enviar email com link de convite (simulado inicialmente)
   - Salvar convite no banco

2. **Atualizar página de Registro**
   - Detectar token de convite na URL
   - Pré-preencher email do convite
   - Mostrar informações do convite (organização, role)

#### Fase 3: Funcionalidades de Gestão

1. **Alterar Role de Usuário** (apenas admin)
   - Promover vendor para admin
   - Rebaixar admin para vendor (exceto próprio)

2. **Ativar/Desativar Usuário** (apenas admin)
   - Desativar bloqueia acesso
   - Mantém histórico de propostas

3. **Cancelar/Reenviar Convites** (apenas admin)

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useUsers.ts` | Hook para gestão de usuários |
| `src/hooks/useInvitations.ts` | Hook para gestão de convites |
| `supabase/functions/send-invitation/index.ts` | Edge function para envio de convites |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Users.tsx` | Remover mock, integrar com hooks |
| `src/pages/Register.tsx` | Exibir informações do convite |

---

### Detalhes Técnicos

#### Hook `useUsers.ts`

```text
Query principal:
- JOIN profiles + user_roles
- Filtrar por organization_id
- Incluir contagem de propostas
- Ordenar por nome

Funções:
- toggleUserActive(userId, active)
- updateUserRole(userId, role)
```

#### Hook `useInvitations.ts`

```text
Query principal:
- Buscar invitations WHERE status = 'pending'
- Filtrar por organization_id

Funções:
- createInvitation(email, role)
- resendInvitation(invitationId)
- cancelInvitation(invitationId)
```

#### Edge Function `send-invitation`

```text
1. Recebe: { email, role }
2. Gera token único (UUID)
3. Calcula expiração (7 dias)
4. Insere na tabela invitations
5. Retorna link do convite
```

---

### Fluxo do Sistema de Convites

```text
1. Admin clica "Enviar Convite"
2. Preenche email e seleciona role
3. Sistema gera token único
4. Convite salvo com status "pending"
5. Link de convite: /register?token=xxx&email=xxx

6. Convidado acessa o link
7. Completa cadastro (nome, senha)
8. Trigger handle_new_user:
   - Detecta convite válido pelo email
   - Associa à organização
   - Define role do convite
   - Marca convite como "accepted"
```

---

### Permissões e Segurança

| Ação | Admin | Vendor |
|------|-------|--------|
| Ver lista de usuários | Sim | Sim |
| Enviar convites | Sim | Nao |
| Alterar roles | Sim | Nao |
| Ativar/Desativar usuários | Sim | Nao |
| Ver próprio perfil | Sim | Sim |

---

### Interface de Usuário

**Cards de estatísticas** (dados reais):
- Usuários Ativos
- WhatsApp Conectados
- Convites Pendentes

**Tabela de Usuários**:
- Avatar + Nome + Email
- Role (com botão para alterar se admin)
- Status WhatsApp
- Contagem de propostas
- Data de cadastro
- Status (Ativo/Inativo)
- Menu de ações (alterar role, ativar/desativar)

**Seção de Convites Pendentes**:
- Email do convidado
- Role atribuído
- Data de expiração
- Botões: Reenviar | Cancelar

---

### Resultado Esperado

Após a implementação:

1. A página de Usuários mostrará dados reais do banco
2. Admin poderá convidar novos membros por email
3. Convidados receberão link para cadastro
4. Admin poderá gerenciar roles e status dos usuários
5. Todo o histórico de propostas será mantido por usuário
