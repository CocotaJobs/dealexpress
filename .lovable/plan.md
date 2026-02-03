

## Plano: Envio de Email via Resend + Acesso aos Links de Convite

### Problemas Identificados

1. **Botão "Reenviar"** gera novo convite, mas não mostra o link para copiar
2. **Lista de convites pendentes** não tem opção de copiar o link existente
3. **Falta integração com Resend** para envio automático de email

---

### Solução Completa

#### Parte 1: Acesso aos Links de Convite

Adicionar funcionalidade para:
- **Copiar link** diretamente da lista de convites pendentes
- **Modal com link** ao reenviar convite (igual ao fluxo de criação)

#### Parte 2: Envio Automático de Email via Resend

Integrar Resend para enviar email automaticamente quando o convite é criado ou reenviado.

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-invitation/index.ts` | Adicionar integração com Resend para envio de email |
| `src/pages/Users.tsx` | Adicionar botão "Copiar Link" na lista de convites + modal de link ao reenviar |
| `src/hooks/useInvitations.ts` | Expor dados do resend para mostrar modal |

---

### Detalhes Técnicos

#### 1. Edge Function `send-invitation`

Adicionar envio de email via Resend:

```text
Fluxo atualizado:
1. Validar permissões (admin)
2. Gerar token único
3. Criar convite no banco
4. Buscar nome da organização
5. Enviar email via Resend (NOVO)
6. Retornar link + confirmação de envio
```

O email incluirá:
- Nome da organização
- Perfil atribuído (Vendedor/Administrador)
- Botão de cadastro
- Link alternativo em texto

#### 2. Interface `Users.tsx`

Na seção de **Convites Pendentes**, cada convite terá:

```text
┌────────────────────────────────────────────────────────────┐
│ joao@empresa.com.br                                        │
│ Perfil: Vendedor • Expira em 10/02/2026                    │
│                                                            │
│    [📋 Copiar Link]  [🔄 Reenviar]  [✕ Cancelar]          │
└────────────────────────────────────────────────────────────┘
```

Ao clicar **Reenviar**, abrirá um modal com o novo link (mesmo comportamento da criação inicial).

#### 3. Hook `useInvitations.ts`

- Expor `lastResendData` para mostrar modal após reenvio
- Gerar link localmente a partir do token para o botão "Copiar"

---

### Geração do Link de Convite

Como já temos o token de cada convite na lista, podemos gerar o link localmente:

```typescript
const getInviteLink = (invitation: Invitation) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/register?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}`;
};
```

---

### Pré-requisito: API Key do Resend

Antes de implementar, você precisa fornecer a chave da API do Resend.

**Opção rápida (sem verificar domínio)**:
1. Crie conta em https://resend.com
2. Gere uma API Key em https://resend.com/api-keys
3. Use o remetente de teste: `onboarding@resend.dev`
4. Limite: 100 emails/dia (suficiente para testes)

**Opção profissional (recomendada para produção)**:
1. Verifique seu domínio em https://resend.com/domains
2. Use remetente como: `convites@seudominio.com.br`

---

### Resultado Esperado

1. **Copiar link** disponível para qualquer convite pendente
2. **Reenviar** mostra o novo link para copiar
3. **Email automático** enviado ao criar/reenviar convite
4. Experiência fluida para gestão de convites

---

### Próximo Passo

Forneça a API Key do Resend para eu configurar o secret e implementar a solução completa.

