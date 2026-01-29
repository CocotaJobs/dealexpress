
# Correção: Chrome Bloqueando Popup do PDF

## Problema Identificado

O Chrome (e outros navegadores) bloqueia `window.open()` quando ele é chamado **após operações assíncronas**. No código atual:

```typescript
const previewPdf = async (proposalId: string) => {
  const result = await generatePdf(proposalId);  // ← Operação async
  if (result?.pdfUrl) {
    window.open(result.pdfUrl, '_blank');  // ← Bloqueado pelo Chrome!
  }
};
```

O navegador considera isso um popup não autorizado porque não foi disparado diretamente pelo clique do usuário.

## Solução Proposta

**Estratégia**: Abrir a janela **antes** da operação assíncrona (quando ainda temos o "contexto de clique do usuário"), e depois redirecionar essa janela para a URL do PDF.

### Modificação em `src/hooks/usePdfGeneration.ts`

```typescript
const previewPdf = async (proposalId: string) => {
  // Abre a janela ANTES da operação async (permitido pelo navegador)
  const newWindow = window.open('about:blank', '_blank');
  
  const result = await generatePdf(proposalId);
  
  if (result?.pdfUrl && newWindow) {
    // Redireciona a janela já aberta para o PDF
    newWindow.location.href = result.pdfUrl;
  } else if (newWindow) {
    // Se falhou, fecha a janela em branco
    newWindow.close();
  }
  
  return result;
};
```

### Alternativa para Download

Para o download, podemos usar a mesma técnica ou manter como está (downloads geralmente não são bloqueados):

```typescript
const downloadPdf = async (proposalId: string) => {
  const result = await generatePdf(proposalId);
  if (result?.pdfUrl) {
    // Criar link e forçar download (não é popup)
    const a = document.createElement('a');
    a.href = result.pdfUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  return result;
};
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePdfGeneration.ts` | Abrir janela antes do await, redirecionar depois |

## Comportamento Esperado

1. Usuário clica em "Baixar PDF" ou "Visualizar"
2. Uma nova aba abre imediatamente (em branco ou com loading)
3. O PDF é gerado em background
4. A aba é redirecionada para o PDF
5. Se houver erro, a aba é fechada e um toast de erro é exibido

## Melhoria Adicional (Opcional)

Podemos mostrar uma página de "Gerando PDF..." enquanto aguarda:

```typescript
const newWindow = window.open('', '_blank');
if (newWindow) {
  newWindow.document.write(`
    <html>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <div style="text-align:center;">
          <p>Gerando PDF...</p>
          <p style="color:#666;">Aguarde um momento</p>
        </div>
      </body>
    </html>
  `);
}
```

Isso dá feedback visual ao usuário enquanto o PDF está sendo gerado.
