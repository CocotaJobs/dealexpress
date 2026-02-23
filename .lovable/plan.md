

## Marcar Proposta como Enviada Manualmente

Adicionar um botão/opção que permite ao usuário alterar manualmente o status de uma proposta de "Rascunho" para "Enviada", sem precisar enviar via WhatsApp.

---

## Alterações

### 1. Arquivo: `src/pages/Proposals.tsx`

Adicionar uma nova opção no menu dropdown (DropdownMenu) de cada proposta com status "draft":
- Novo item "Marcar como Enviada" com icone `Send`
- Aparece entre "Duplicar" e "Excluir" para propostas em rascunho
- Exibe dialog de confirmacao antes de alterar o status
- Chama `sendProposal(id)` do hook `useProposals` (que ja existe e faz exatamente isso: atualiza status para "sent" e seta `sent_at`)

Estado adicional necessario:
- `markingSentId` para controlar loading no item do menu
- `AlertDialog` de confirmacao para evitar cliques acidentais

### 2. Arquivo: `src/pages/ViewProposal.tsx`

Adicionar um botao "Marcar como Enviada" na area de acoes do header, visivel apenas quando o status e "draft":
- Botao com icone `Send` e variante `outline`
- Exibe dialog de confirmacao
- Chama `sendProposal(proposal.id)` e recarrega a proposta apos sucesso

### 3. Nenhuma outra alteracao

- O hook `useProposals` ja possui a funcao `sendProposal` que faz o UPDATE no banco setando `status = 'sent'` e `sent_at = now()`
- Banco de dados: sem mudancas
- RLS: ja permite update de propostas pelo criador ou admin
- Edge Functions: sem mudancas

---

## Resumo

| Local | Mudanca |
|---|---|
| `src/pages/Proposals.tsx` | Nova opcao "Marcar como Enviada" no dropdown + dialog de confirmacao |
| `src/pages/ViewProposal.tsx` | Novo botao "Marcar como Enviada" no header + dialog de confirmacao |
| Backend | Nenhuma (reutiliza `sendProposal` existente) |

