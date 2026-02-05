

## Objetivo

Eliminar definitivamente o problema de “pré-visualização bloqueada” (popup blocked) ao visualizar o PDF da proposta, sem comprometer nenhuma outra funcionalidade (criação/edição/envio/geração/download) e mantendo o comportamento atual de geração de PDF.

## Diagnóstico (por que continua acontecendo)

Hoje a pré-visualização depende de abrir uma nova aba/janela com `window.open(...)` (mesmo com o cuidado correto de abrir antes de qualquer `await`). Isso ainda falha em cenários comuns onde o navegador simplesmente bloqueia popups por padrão ou por contexto, por exemplo:

- iOS Safari (configurações mais restritivas)
- Navegadores embutidos (ex.: dentro de WhatsApp/Instagram/LinkedIn)
- Perfis corporativos / políticas do navegador
- Extensões de bloqueio
- Alguns casos de “double click” rápido / foco perdido / gesture invalidado

Ou seja: mesmo “fazendo certo”, popup pode ser bloqueado. A única correção “de uma vez por todas” é parar de depender de popup para pré-visualização.

## Solução proposta (robusta e definitiva)

Trocar o fluxo de pré-visualização para **pré-visualização dentro do próprio app** (sem abrir nova aba), usando um **Dialog/Modal** com um visualizador (iframe/object) alimentado por um **Blob URL** (PDF baixado via `fetch` e convertido em `URL.createObjectURL(blob)`).

- Isso elimina a causa raiz: **nenhum popup é aberto**, então nada para o navegador bloquear.
- Mantém o download funcionando (inclusive podemos oferecer “Baixar” dentro do modal).
- Opcional: oferecer um botão “Abrir em nova guia” como fallback, mas não depender disso.

## Mudanças planejadas no código

### 1) Criar um componente reutilizável de preview (UI)
Criar um componente do tipo `PdfPreviewDialog` (ex.: `src/components/proposals/PdfPreviewDialog.tsx`) que:

- Recebe `open`, `onOpenChange`
- Recebe `blobUrl` (string) e `fileName`
- Renderiza:
  - Estado carregando
  - Estado erro (com opção “Baixar PDF” ou “Tentar novamente”)
  - Visualização do PDF via `<iframe src={blobUrl} />` (ou `<object data={blobUrl} type="application/pdf" />` como fallback)
- Ao fechar:
  - Revogar o blob URL (`URL.revokeObjectURL`) para evitar vazamento de memória

### 2) Ajustar o hook `usePdfGeneration` para suportar preview sem popup
Hoje existe `previewPdf(...)` focado em janela/aba. Vamos adicionar uma função nova (sem quebrar o resto), por exemplo:

- `generatePdfBlobUrl(proposalId): Promise<{ blobUrl: string; fileName: string } | null>`
  - Internamente:
    1. chama `generatePdf(proposalId)`
    2. faz `fetch` do `pdfUrl` com cache-buster/no-store
    3. cria `blobUrl = URL.createObjectURL(blob)`
    4. retorna `{ blobUrl, fileName }`
  - Em caso de falha:
    - retorna `null` e dispara toast de erro (mantendo o padrão do app)

Importante: manter `generatePdf` e `downloadPdf` intactos para não afetar envio via WhatsApp e download.

### 3) Atualizar `NewProposal` para abrir o modal em vez de popup
No `src/pages/NewProposal.tsx`:

- Remover a dependência de `openPdfPreviewWindow()` no fluxo de pré-visualização
- Novo fluxo do botão “Pré-visualizar PDF”:
  1. Validar form + itens
  2. Salvar (createProposal) como já faz hoje
  3. Chamar `generatePdfBlobUrl(proposalId)`
  4. Se OK, abrir `PdfPreviewDialog` com o `blobUrl`
  5. Se falhar, manter toast de erro e não abrir nada

Estado novo na página:
- `isPreviewDialogOpen`
- `previewBlobUrl`
- `previewFileName`

Cleanup:
- Quando fechar o modal: `revokeObjectURL` e limpar estado.

### 4) Atualizar `EditProposal` para o mesmo comportamento
No `src/pages/EditProposal.tsx`:

- Mesma troca: em `handlePreview`, salvar via `updateProposal`, gerar blob URL, abrir modal.

Isso garante consistência total em “Nova Proposta” e “Editar Proposta”.

### 5) (Opcional, mas recomendado) Unificar também no `ViewProposal`
Atualmente `ViewProposal` tem `handlePreviewPdf` mas (pelo arquivo) não está exposto por botão na UI. Mesmo assim, para não deixar código “armadilha”:

- Ou remover o handler não usado
- Ou trocar para usar o novo modal também, caso adicionemos um botão “Visualizar PDF” na tela de visualização futuramente

### 6) Garantias de não-regressão
- Nenhuma mudança em banco de dados
- Nenhuma mudança em permissões/RLS
- Nenhuma mudança no fluxo de “Enviar via WhatsApp” (continua gerando PDF e enviando link)
- Download continua existindo e funcionando
- Apenas substitui o mecanismo de “preview” (de popup para modal interno)

## Testes (obrigatórios após a implementação)

### Teste end-to-end (principal)
1. Login
2. Ir em **/proposals/new**
3. Criar proposta com:
   - 1 item
   - desconto percentual e fixo (testar os dois)
4. Clicar **Pré-visualizar PDF**
   - Esperado: abre modal dentro do app, sem popup, PDF renderiza
5. Fechar modal e abrir novamente (testar repetição)
6. Confirmar que continua possível:
   - Salvar rascunho
   - Editar
   - Enviar via WhatsApp
   - Baixar PDF

### Testes de compatibilidade (onde antes quebrava)
- Testar no mobile (Safari/Chrome)
- Testar em navegador embutido (se aplicável ao seu uso)
- Verificar que não aparece mais toast “Popup bloqueado”

### Testes técnicos rápidos
- Abrir e fechar preview várias vezes e garantir que não acumula URLs (revoke funcionando)
- Verificar console sem erros de CSP/iframe

## Segurança (garantir que não haja erros de segurança)

Após as mudanças:
- Executar o security scan do backend novamente (para confirmar que nada mudou do ponto de vista de políticas/exposição)
- Validar que a nova pré-visualização não expõe tokens/sessões (ela só usa `fetch` do PDF e blob local, sem armazenar credenciais em URL)
- Confirmar que nenhuma rota pública foi criada para servir PDFs sem autenticação

## Entrega (o que você vai perceber)
- O botão “Pré-visualizar PDF” deixa de abrir nova aba e passa a abrir um modal com o PDF
- Não depende de permitir popups
- O bloqueio “Popup bloqueado” deixa de existir nesse fluxo

## Observação importante
Se você faz questão de abrir em nova aba (por preferência), podemos adicionar no modal um botão “Abrir em nova guia”. Mas a correção definitiva é: o preview padrão não depender de popups.

