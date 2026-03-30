

## Correção: Mensagem WhatsApp aparece para o vendedor mas não chega ao cliente

### Diagnóstico

O comportamento descrito confirma o problema: a Evolution API **aceita** o envio e registra a mensagem na sessão do vendedor, mas quando tenta **entregar** ao destinatário, precisa baixar o PDF da `mediaUrl` (signed URL do Supabase Storage). Como o servidor da Evolution API não consegue acessar essa URL (bucket privado, headers de autenticação, etc.), a entrega falha silenciosamente — a mensagem fica "enviada" no lado do vendedor mas nunca chega ao cliente.

### Solução

**Arquivo**: `supabase/functions/whatsapp/index.ts` — função `handleSendMessage` (linhas 543-577)

Modificar o bloco de envio de mídia para:

1. **Baixar o PDF dentro da edge function** via `fetch(mediaUrl)` — funciona porque a edge function tem acesso ao Supabase Storage
2. **Converter para base64** e montar uma data URI
3. **Adicionar campo `mimetype`** ao payload da Evolution API
4. **Manter logs** do tamanho do arquivo para diagnóstico

```text
Fluxo atual (falha silenciosa na entrega):
  Edge Function passa URL → Evolution API aceita → Mensagem aparece no vendedor
  → Evolution tenta baixar PDF da URL → Falha → Cliente não recebe

Fluxo corrigido:
  Edge Function baixa PDF → Converte base64 → Evolution API recebe dados diretos
  → Mensagem entregue ao cliente ✓
```

Nenhuma outra alteração necessária no frontend ou no fluxo de geração de PDF.

