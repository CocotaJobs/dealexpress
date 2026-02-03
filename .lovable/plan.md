
## Plano: Correções de Fuso Horário, Bloqueio de Popup e Redirecionamento

### Problemas Identificados

| # | Problema | Causa |
|---|----------|-------|
| 1 | Data atual com fuso horário errado | A função `formatDateExtended()` usa `new Date()` que utiliza UTC no servidor Edge Function |
| 2 | Chrome bloqueia a pré-visualização do PDF e gera propostas duplicadas | Ao fechar a aba bloqueada e salvar novamente, o `createProposal` é chamado duas vezes |
| 3 | Ao salvar rascunho, redireciona para `/proposals` | O código atual navega para a lista após salvar |

---

### Correção 1: Fuso Horário (America/Sao_Paulo)

**Arquivo:** `supabase/functions/generate-pdf/index.ts`

**Problema atual (linhas 63-74):**
```javascript
const formatDateExtended = (): string => {
  const now = new Date(); // Usa UTC no servidor
  // ...
};
```

**Solução:**
Usar a API `toLocaleDateString` com o timezone `America/Sao_Paulo`:

```javascript
const formatDateExtended = (): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  // Use Brasília timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Sao_Paulo' };
  
  const day = new Intl.DateTimeFormat('pt-BR', { ...options, day: 'numeric' }).format(now);
  const monthIndex = parseInt(new Intl.DateTimeFormat('pt-BR', { ...options, month: 'numeric' }).format(now)) - 1;
  const year = new Intl.DateTimeFormat('pt-BR', { ...options, year: 'numeric' }).format(now);
  
  return `${day} de ${months[monthIndex]} de ${year}`;
};
```

Também atualizar a função `formatDate` para usar o mesmo timezone quando formatar datas.

---

### Correção 2: Evitar Propostas Duplicadas

**Arquivos:** `src/pages/NewProposal.tsx` e `src/pages/EditProposal.tsx`

**Problema:**
O fluxo atual no `handlePreview`:
1. Abre janela de preview
2. Cria/atualiza proposta
3. Gera PDF
4. Se o usuário fechar a aba antes de completar e clicar em "Salvar", cria outra proposta

**Solução:**
Adicionar um estado para controlar se a proposta já foi criada e redirecionar para a página de edição após a primeira criação. Isso evita que uma segunda chamada de "Salvar Rascunho" crie uma nova proposta.

**Para NewProposal.tsx:**
1. Adicionar estado `createdProposalId` para rastrear se a proposta já foi criada
2. Se a proposta já foi criada, redirecionar para a página de edição
3. Após `handlePreview` criar a proposta, definir o ID

```javascript
const [createdProposalId, setCreatedProposalId] = useState<string | null>(null);

const handleSaveDraft = async () => {
  if (!validateForm()) return;
  
  // Se já criou uma proposta, redirecionar para edição
  if (createdProposalId) {
    navigate(`/proposals/${createdProposalId}/edit`);
    return;
  }
  
  // ... resto do código
};

const handlePreview = async () => {
  // ...
  const result = await createProposal(...);
  
  if (result.data) {
    setCreatedProposalId(result.data.id); // Marcar como criada
    await previewPdf(result.data.id, previewWindow);
  }
  // ...
};
```

---

### Correção 3: Manter na Mesma Página ao Salvar Rascunho

**Arquivo:** `src/pages/NewProposal.tsx`

**Problema atual (linhas 209-211):**
```javascript
if (result.data) {
  navigate('/proposals'); // Redireciona para lista
}
```

**Solução para NewProposal:**
Após criar a proposta com sucesso, navegar para a página de edição da proposta criada em vez de redirecionar para a lista:

```javascript
if (result.data) {
  navigate(`/proposals/${result.data.id}/edit`);
}
```

**Arquivo:** `src/pages/EditProposal.tsx`

**Problema atual (linhas 278-280):**
```javascript
if (result.data) {
  navigate(`/proposals/${id}`); // Redireciona para visualização
}
```

**Solução para EditProposal:**
Remover o redirecionamento e apenas mostrar um toast de sucesso:

```javascript
if (result.data) {
  toast({
    title: 'Proposta salva!',
    description: 'As alterações foram salvas com sucesso.',
  });
}
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Usar timezone `America/Sao_Paulo` nas funções de formatação de data |
| `src/pages/NewProposal.tsx` | Adicionar estado para evitar duplicidade + navegar para página de edição após salvar |
| `src/pages/EditProposal.tsx` | Remover redirecionamento ao salvar, apenas mostrar toast |

---

### Resultado Esperado

1. A data no PDF será formatada com o fuso horário de Brasília
2. Não haverá mais propostas duplicadas ao pré-visualizar e depois salvar
3. Ao salvar rascunho, você permanecerá na mesma página (ou será redirecionado para a edição se for uma nova proposta)
