
# Correção: Download de PDF Bloqueado ou Não Iniciado

## Diagnóstico

Após investigação detalhada com o browser automatizado:

1. **A Edge Function `generate-pdf` está funcionando corretamente** - Confirmado com status 200 e URL válida retornada
2. **O toast de sucesso aparece** - "PDF gerado! O arquivo foi criado com sucesso"
3. **O problema está no download** - O navegador pode estar bloqueando o download programático

O código atual de download:
```typescript
const a = document.createElement('a');
a.href = result.pdfUrl;
a.download = result.fileName;
a.click();
```

Este padrão pode falhar porque:
- O download acontece **após operações assíncronas** (geração do PDF)
- Alguns navegadores bloqueiam downloads iniciados fora do contexto de clique direto do usuário
- O atributo `download` em links cross-origin (Supabase Storage) pode não funcionar como esperado

## Solução Proposta

### 1. Para ViewProposal - Download direto via fetch + blob

Modificar `downloadPdf` para baixar o arquivo como blob e criar um Object URL local, garantindo que o download funcione:

```typescript
const downloadPdf = async (proposalId: string) => {
  const result = await generatePdf(proposalId);
  if (result?.pdfUrl) {
    try {
      // Fetch the PDF as blob
      const response = await fetch(result.pdfUrl);
      const blob = await response.blob();
      
      // Create object URL from blob
      const blobUrl = URL.createObjectURL(blob);
      
      // Create and click download link
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up object URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback: open in new tab if download fails
      window.open(result.pdfUrl, '_blank');
    }
  }
  return result;
};
```

### 2. Alternativa mais simples - Abrir em nova aba

Se o download continuar problemático, podemos simplesmente abrir o PDF em uma nova aba:

```typescript
const downloadPdf = async (proposalId: string) => {
  const result = await generatePdf(proposalId);
  if (result?.pdfUrl) {
    // Open PDF in new tab - user can save from there
    window.open(result.pdfUrl, '_blank');
  }
  return result;
};
```

**Importante**: Esta abordagem também pode ser bloqueada pelo Chrome por ser chamada após `await`. Para resolver:

### 3. Solução completa - Mesma abordagem do preview

Aplicar a mesma estratégia do preview: abrir a aba **antes** da operação assíncrona:

```typescript
const downloadPdf = async (proposalId: string, preOpenedWindow?: Window | null) => {
  const result = await generatePdf(proposalId);
  
  if (result?.pdfUrl) {
    if (preOpenedWindow) {
      // Redirect pre-opened window to PDF
      preOpenedWindow.location.href = result.pdfUrl;
    } else {
      // Try to fetch and download as blob
      try {
        const response = await fetch(result.pdfUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: show toast with link
        toast({
          title: 'PDF pronto para download',
          description: 'Clique aqui para baixar o PDF.',
          action: <a href={result.pdfUrl} download={result.fileName}>Baixar</a>
        });
      }
    }
  }
  
  return result;
};
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePdfGeneration.ts` | Modificar `downloadPdf` para usar blob/fetch ou abrir nova aba |

## Comportamento Esperado Após Correção

1. Usuário clica "Baixar PDF"
2. Botão mostra spinner de loading (~5 segundos)
3. Toast de sucesso aparece
4. **O arquivo PDF é baixado automaticamente** ou **abre em nova aba para o usuário salvar**

## Recomendação

Sugiro implementar a **solução com fetch + blob** como primeira opção, com fallback para abrir em nova aba. Isso garante compatibilidade máxima com diferentes navegadores.
