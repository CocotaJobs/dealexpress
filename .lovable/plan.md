
## Plano: Corrigir Pré-visualização de PDF e Erro de Template

### Resumo dos Problemas

1. **Popup sem animação e bloqueada**: A janela de pré-visualização é aberta após operações assíncronas, causando bloqueio pelo navegador
2. **Erro de template**: Seu arquivo `.docx` tem tags malformadas (ex: `{{{{data}}}}` ou `{ {data}}`)

---

### Solução 1: Corrigir o Fluxo de Popup

**Problema Técnico:**
```javascript
// Código atual em ViewProposal.tsx
const handlePreviewPdf = () => {
  if (proposal) {
    previewPdf(proposal.id); // ← Abre popup DEPOIS de operações async = BLOQUEADO
  }
};
```

**Correção:**
Usar o helper `openPdfPreviewWindow()` ANTES de qualquer operação assíncrona:

```javascript
const handlePreviewPdf = () => {
  if (!proposal) return;
  // Abre a janela IMEDIATAMENTE no clique (antes de qualquer await)
  const previewWindow = openPdfPreviewWindow();
  // Passa a janela pré-aberta para previewPdf
  previewPdf(proposal.id, previewWindow);
};
```

---

### Solução 2: Corrigir o Erro de Template DOCX

O erro nos logs indica:
```
Duplicate open tag: "{{data"
```

**Causa:** O Word frequentemente "quebra" as tags quando você edita o texto. Por exemplo, ao digitar `{{cliente_nome}}`, o Word pode salvar internamente como:

```xml
<w:t>{{</w:t><w:t>cliente_nome}}</w:t>
```

Ou pior:
```xml
<w:t>{</w:t><w:t>{</w:t><w:t>cliente_nome</w:t><w:t>}</w:t><w:t>}</w:t>
```

**Como Corrigir no Template:**
1. Abra seu arquivo `.docx` no Word
2. Para cada placeholder, selecione o texto inteiro (ex: `{{cliente_nome}}`)
3. Apague completamente
4. Digite novamente de uma só vez (sem pausas)
5. Salve e faça upload novamente

**Alternativa - Usar campos simples:**
- Em vez de `{{campo}}`, você pode usar apenas `{campo}` (chaves simples)
- Isso pode ser configurado no código da edge function

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ViewProposal.tsx` | Usar `openPdfPreviewWindow()` no `handlePreviewPdf` para evitar bloqueio de popup |
| `supabase/functions/generate-pdf/index.ts` | (Opcional) Adicionar melhor tratamento de erros e log para facilitar diagnóstico |

---

### Mudança Detalhada em ViewProposal.tsx

**Antes (linhas 126-130):**
```javascript
const handlePreviewPdf = () => {
  if (proposal) {
    previewPdf(proposal.id);
  }
};
```

**Depois:**
```javascript
const handlePreviewPdf = () => {
  if (!proposal) return;
  // Abrir janela IMEDIATAMENTE (antes de qualquer async)
  const previewWindow = openPdfPreviewWindow();
  // Passar a janela pré-aberta para o previewPdf
  previewPdf(proposal.id, previewWindow);
};
```

Também preciso atualizar a desestruturação do hook para incluir `openPdfPreviewWindow`:
```javascript
const { isGenerating, previewPdf, downloadPdf, generatePdf, openPdfPreviewWindow } = usePdfGeneration();
```

---

### Próximos Passos do Usuário

Após a implementação:
1. **Testar a pré-visualização** - A janela deve abrir imediatamente com "Gerando PDF..." e depois mostrar o PDF
2. **Corrigir o template Word** - Redigitar os placeholders sem pausas
3. **Re-fazer upload do template** - Após corrigir as tags
4. **Testar novamente** - Verificar se o template personalizado está sendo usado (o log deve mostrar `custom template: true`)
