

## Diagnóstico (por que “continua bloqueando”)

Mesmo com a mudança em `usePdfGeneration.previewPdf()` abrindo a aba antes do `await generatePdf(...)`, ainda existe um caso onde o Chrome bloqueia:

- Em **NewProposal** e **EditProposal**, o fluxo “Pré-visualizar/Visualizar PDF” faz primeiro um **`await createProposal(...)` / `await updateProposal(...)`** e **só depois** chama `previewPdf(...)`.
- O Chrome considera que, após um `await`, você **perde o “user gesture” (o contexto do clique)**.
- Resultado: quando `previewPdf()` roda, o `window.open()` acontece **tarde demais** (após um `await` anterior no handler) e o Chrome trata como popup não autorizado.

Onde isso acontece hoje:
- `src/pages/NewProposal.tsx` → `handlePreview` (abre preview **depois** de `await createProposal`)
- `src/pages/EditProposal.tsx` → `handlePreview` (abre preview **depois** de `await updateProposal`)

## Objetivo

Garantir que a aba do preview seja aberta **no mesmo “tick” do clique** do usuário, antes de qualquer operação async (antes de qualquer `await` no handler), e depois apenas:
- gerar o PDF
- redirecionar a aba já aberta para a URL do PDF

Isso evita o bloqueio do Chrome.

---

## Mudanças propostas (implementação)

### 1) Refatorar o hook `usePdfGeneration` para aceitar “janela pré-aberta”

Arquivo: `src/hooks/usePdfGeneration.ts`

Ajustes:
1. Criar um helper no hook:
   - `openPdfPreviewWindow()` → faz `window.open('', '_blank')` e escreve o HTML “Gerando PDF...”
2. Alterar `previewPdf` para aceitar uma janela opcional:
   - `previewPdf(proposalId: string, existingWindow?: Window | null)`
   - Se `existingWindow` vier, **não chamar `window.open`** dentro do hook; só usar `existingWindow`.
3. Manter o comportamento atual para quem chamar `previewPdf(proposalId)` diretamente (sem passar window), mas o fluxo “Preview após salvar” passará uma janela pré-aberta.

Comportamento esperado do hook:
- Se receber uma janela válida:
  - usa a janela
  - depois redireciona `existingWindow.location.href = pdfUrl`
- Se não receber janela e tentar abrir e falhar (`null`):
  - exibir toast orientando o usuário a permitir popups (e não tentar seguir com preview em nova aba)

### 2) Corrigir NewProposal: abrir a aba ANTES de salvar (antes do primeiro await)

Arquivo: `src/pages/NewProposal.tsx`

Alterar `handlePreview` para:

1. Validar form e itens (continua igual)
2. Abrir a nova aba **imediatamente** (antes de `setIsPreviewing(true)` e principalmente antes de `await createProposal(...)`):
   - `const previewWindow = window.open('', '_blank')`
   - escrever o HTML “Gerando PDF...” ali
   - se `previewWindow === null`, mostrar toast “Popup bloqueado, permita popups” e abortar
3. Só depois:
   - `await createProposal(...)`
4. Se criou com sucesso:
   - `await previewPdf(result.data.id, previewWindow)`
5. Se falhou em criar:
   - fechar a aba aberta (para não deixar uma aba em branco)

Isso garante que o popup é criado ainda no contexto do clique.

### 3) Corrigir EditProposal: abrir a aba ANTES de atualizar

Arquivo: `src/pages/EditProposal.tsx`

Mesma estratégia do NewProposal:

1. Validar
2. Abrir a aba **antes** de `await updateProposal(...)`
3. Se `window.open` retornar `null`, toast e abortar
4. Atualiza a proposta
5. Se sucesso, chama `previewPdf(id, previewWindow)`
6. Se falhar, fecha a aba

### 4) (Opcional, mas recomendado) Mensagem clara quando popup está bloqueado

Em ambos os handlers (New/Edit):
- Se `window.open` retornar `null`, mostrar toast com instrução simples:
  - “O Chrome bloqueou a abertura da aba. Permita popups para este site e tente novamente. Alternativamente use ‘Baixar PDF’.”

---

## Testes de validação (passo a passo)

1) **Chrome** → Nova proposta → clicar **Pré-visualizar PDF**
- Deve abrir uma aba imediatamente com “Gerando PDF…”
- Após alguns segundos, a aba deve navegar para o PDF
- Não pode aparecer o bloqueio de popup

2) **Chrome** → Editar proposta → clicar **Visualizar PDF**
- Mesmo comportamento acima

3) Com popups bloqueados propositalmente:
- Ao clicar Preview, deve aparecer toast avisando
- Não deve ficar aba “fantasma” ou comportamento inconsistente

---

## Observações / edge cases

- O redirecionamento `newWindow.location.href = pdfUrl` não depende de “user gesture”, então é seguro ocorrer depois.
- Se a geração falhar, fechamos a aba aberta (quando ela foi aberta por script). Se o Chrome impedir fechar, ao menos a aba mostrará o “Gerando PDF…”; podemos também atualizar o conteúdo para “Falha ao gerar PDF” (opcional).

---

## Arquivos envolvidos

- `src/hooks/usePdfGeneration.ts` (ajustar API do hook para suportar window pré-aberta)
- `src/pages/NewProposal.tsx` (abrir aba antes do primeiro await no preview)
- `src/pages/EditProposal.tsx` (abrir aba antes do primeiro await no preview)

