
## Diagnóstico atualizado: o problema mudou

Pelos logs mais recentes, o envio agora falha antes mesmo de aparecer na conversa do vendedor. O arquivo é baixado com sucesso dentro da função, mas a API do WhatsApp responde:

```text
400 Bad Request
"Owned media must be a url or base64"
```

Isso indica que a correção anterior removeu o problema da URL assinada, mas o formato do `media` enviado para a Evolution API não está sendo aceito por essa instância/versão.

## O que ajustar

### 1. Corrigir o payload de envio de mídia
**Arquivo:** `supabase/functions/whatsapp/index.ts`

Na função `handleSendMessage`, mudar a estratégia de envio em vez de depender só do formato atual `data:application/pdf;base64,...`.

Plano de ajuste:
- manter o download do PDF dentro da função
- manter `fileName` e `mimetype`
- trocar o envio do campo `media` para um formato aceito pela Evolution API desta instância:
  - primeiro usar **base64 puro** (sem prefixo `data:`), ou
  - usar **multipart/form-data com arquivo real**, se necessário

Como os logs mostram rejeição explícita do valor atual, a prioridade é adaptar o payload para o formato compatível.

### 2. Melhorar logs para distinguir falhas
Ainda em `handleSendMessage`:
- registrar qual formato está sendo usado (`data-uri`, `raw-base64` ou `multipart`)
- registrar `mediaType`, `fileName`, tamanho do arquivo e início sanitizado do payload
- manter resposta de erro detalhada no log do servidor

Isso evita novo diagnóstico no escuro caso a API continue rejeitando.

### 3. Tornar a mensagem de erro do app mais precisa
**Arquivos:**
- `src/pages/NewProposal.tsx`
- `src/pages/EditProposal.tsx`
- `src/pages/ViewProposal.tsx`

Hoje o frontend só mostra erro genérico. Vou ajustar o fluxo para:
- exibir o erro retornado pela edge function quando houver
- diferenciar:
  - falha ao gerar PDF
  - falha ao baixar arquivo
  - falha no envio para WhatsApp

Assim o vendedor não recebe confirmação enganosa.

## Ordem de implementação

1. Revisar `handleSendMessage` e substituir o formato atual do `media`
2. Padronizar logs de envio de documento
3. Ajustar tratamento de erro nas 3 telas que enviam proposta
4. Validar novamente o fluxo de envio

## Detalhes técnicos

```text
Fluxo atual:
  gerar PDF -> baixar PDF na função -> converter -> enviar como data URI
  -> Evolution responde 400 -> nada aparece no WhatsApp

Fluxo corrigido:
  gerar PDF -> baixar PDF na função -> enviar em formato compatível com a Evolution
  -> API aceita -> mensagem volta a aparecer e segue para o cliente
```

### Evidência encontrada
Nos logs:
- `Media downloaded: 76538 bytes, base64 length: 102052`
- depois:
- `Error sending media: {"status":400,"error":"Bad Request","response":{"message":["Owned media must be a url or base64"]}}`

Ou seja:
- o download do PDF funciona
- a instância está conectada
- o número está sendo formatado corretamente
- a falha está concentrada no **payload do documento**

### Arquivos envolvidos
- `supabase/functions/whatsapp/index.ts`
- `src/pages/NewProposal.tsx`
- `src/pages/EditProposal.tsx`
- `src/pages/ViewProposal.tsx`
