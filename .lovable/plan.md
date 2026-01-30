
## Plano: Corrigir Template Obrigatório, Erro de Parsing e Bloqueio de Popup

### Resumo dos Problemas Identificados

| Problema | Causa Raiz | Log/Evidência |
|----------|-----------|---------------|
| Template não usado | Sistema faz fallback para PDF padrão quando há erro | `usedCustomTemplate: false` |
| Erro "Duplicate open tag" | Word fragmenta as tags `{{` em elementos XML separados | `xtag: "{{data"` nos logs |
| Popup bloqueada | URL do Supabase Storage bloqueada diretamente | `ERR_BLOCKED_BY_CLIENT` |

---

### Solução Proposta

#### 1. Remover Fallback - Template é Obrigatório

**Arquivo:** `supabase/functions/generate-pdf/index.ts`

Quando não houver template ativo ou quando o template tiver erro de processamento, retornar erro em vez de gerar PDF padrão:

**Mudanças:**
- Se não existir template ativo → retornar erro 400 com mensagem clara
- Se houver erro ao processar template → retornar erro 500 com detalhes do problema (não fazer fallback)
- Adicionar detalhes de diagnóstico no erro para facilitar correção do template

#### 2. Corrigir Parsing de Tags com InspectModule

**Arquivo:** `supabase/functions/generate-pdf/index.ts`

O problema `{{data` indica que o Word está salvando as chaves em elementos XML separados. Solução: usar o **InspectModule** do Docxtemplater para ajudar a identificar problemas, ou implementar um pré-processamento que limpa as tags corrompidas.

**Abordagem principal:** Adicionar melhor tratamento de erros com mensagens claras sobre qual tag está com problema e como corrigir.

#### 3. Corrigir Bloqueio de Popup

**Problema:** O Chrome está bloqueando o redirecionamento para a URL do Supabase Storage (`ocigsqgbccaeeypqegrv.supabase.co`).

**Arquivo:** `src/hooks/usePdfGeneration.ts`

**Solução:** Em vez de redirecionar a janela popup para a URL do Storage, vamos:
1. Fazer fetch do PDF no frontend
2. Criar um Blob URL local (`blob:...`)
3. Redirecionar a popup para o Blob URL
4. Isso evita bloqueios de extensões/navegadores

---

### Detalhes Técnicos

#### Arquivo 1: `supabase/functions/generate-pdf/index.ts`

**Mudança 1 - Erro quando não há template (linhas ~676-684):**
```typescript
// Antes: usava fallback silenciosamente
if (!template || templateError) {
  console.log('No active template found, using default pdf-lib template');
  pdfBuffer = await generateDefaultPdf(proposalData);
}

// Depois: retorna erro obrigatório
if (!template || templateError) {
  console.error('No active template found - template is required');
  return new Response(
    JSON.stringify({ 
      error: 'Template não encontrado', 
      details: 'É necessário ter um template ativo para gerar PDFs. Acesse a página de Templates e faça upload de um arquivo .docx.' 
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Mudança 2 - Erro detalhado no processamento do template (linhas ~737-740):**
```typescript
// Antes: fallback para padrão
} catch (templateProcessError) {
  console.error('Error processing custom template, falling back to default:', templateProcessError);
  pdfBuffer = await generateDefaultPdf(proposalData);
}

// Depois: retorna erro com detalhes
} catch (templateProcessError) {
  console.error('Error processing custom template:', templateProcessError);
  
  // Extrair mensagem de erro útil
  let errorMessage = 'Erro ao processar template';
  let errorDetails = String(templateProcessError);
  
  if (templateProcessError?.properties?.errors) {
    const errors = templateProcessError.properties.errors;
    const firstError = errors[0];
    if (firstError?.properties?.xtag) {
      errorMessage = `Erro na tag: "${firstError.properties.xtag}"`;
      errorDetails = `${firstError.properties.explanation || ''}. Dica: Abra o template Word, delete completamente a tag e digite-a novamente sem pausas.`;
    }
  }
  
  return new Response(
    JSON.stringify({ 
      error: errorMessage, 
      details: errorDetails 
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### Arquivo 2: `src/hooks/usePdfGeneration.ts`

**Mudança - Usar Blob URL para evitar bloqueio (função previewPdf):**
```typescript
const previewPdf = async (proposalId: string, existingWindow?: Window | null) => {
  const targetWindow = existingWindow ?? window.open('', '_blank');
  
  if (!targetWindow && !existingWindow) {
    toast({
      title: 'Popup bloqueado',
      description: 'Permita popups para este site ou use "Baixar PDF".',
      variant: 'destructive',
    });
    return null;
  }
  
  if (targetWindow && !existingWindow) {
    targetWindow.document.write(LOADING_HTML);
  }
  
  const result = await generatePdf(proposalId);
  
  if (result?.pdfUrl && targetWindow) {
    try {
      // Fazer fetch do PDF e criar Blob URL local para evitar bloqueio
      const response = await fetch(withCacheBuster(result.pdfUrl));
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      targetWindow.location.href = blobUrl;
    } catch (fetchError) {
      console.error('Error fetching PDF for preview:', fetchError);
      // Fallback: tentar URL direta
      targetWindow.location.href = withCacheBuster(result.pdfUrl);
    }
  } else if (targetWindow) {
    try {
      targetWindow.document.open();
      targetWindow.document.write(ERROR_HTML);
      targetWindow.document.close();
    } catch {
      targetWindow.close();
    }
  }
  
  return result;
};
```

---

### Sobre o Erro no Seu Template

O erro `"Duplicate open tag: {{data"` indica que o Word salvou a tag `{{data}}` de forma fragmentada internamente. Isso acontece quando:

1. Você digita `{{data}}` pausadamente
2. Você edita parte da tag depois de digitar
3. O Word aplica formatação diferente às chaves

**Para corrigir seu template atual:**
1. Abra o arquivo `.docx` no Word
2. Localize TODAS as tags (como `{{data}}`, `{{cliente_nome}}`, etc.)
3. Para cada tag:
   - Selecione a tag inteira
   - Delete completamente
   - Digite novamente de uma só vez, sem pausas
4. Salve o arquivo
5. Faça upload novamente

**Dica:** Uma forma segura é copiar a tag de um texto simples (Notepad) e colar no Word.

---

### Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Remover fallback, retornar erros claros quando template falhar |
| `src/hooks/usePdfGeneration.ts` | Usar Blob URL para preview evitando bloqueio do Chrome |

---

### Resultado Esperado

Após a implementação:
1. **Sem template ativo** → Erro claro: "Template não encontrado"
2. **Template com tags inválidas** → Erro detalhado: "Erro na tag: {{data - Abra o template e redigite a tag"
3. **Preview do PDF** → Abre corretamente sem bloqueio do Chrome
4. **Template válido** → Gera PDF usando seu template customizado

### Próximo Passo do Usuário

Após implementar estas correções, você precisará:
1. Corrigir as tags no seu template Word (redigitar sem pausas)
2. Fazer upload do template corrigido
3. Testar a geração de PDF novamente
