

## Correção do Webhook da Evolution API

O QR Code não está aparecendo porque os webhooks da Evolution API não estão sendo processados corretamente pela edge function.

### Diagnóstico

A instância do WhatsApp está sendo criada com sucesso na Evolution API e entra em estado "connecting". O QR Code deveria chegar via webhook (`QRCODE_UPDATED`), mas:

- Nenhum log de webhook aparece nos registros da edge function
- O polling de status retorna `qrcode: null` consistentemente
- A instância fica alternando entre estados "close" e "connecting"

### Causa Raiz

A Evolution API envia webhooks no formato:
```text
{
  "event": "QRCODE_UPDATED",
  "instance": "user_xxx",
  "data": { "qrcode": { "base64": "..." } }
}
```

Porém, a edge function espera que o body tenha `action: "webhook"` (linha 87) para identificar que e um webhook e pular a autenticacao. Como a Evolution API nao envia o campo `action`, o request cai no bloco de autenticacao (linha 92), que exige um Bearer token. O webhook da Evolution nao tem Bearer token, entao retorna 401 silenciosamente (sem logs).

### Solucao

Modificar o inicio da edge function `supabase/functions/whatsapp/index.ts` para detectar webhooks da Evolution API automaticamente pelo formato do body, antes de exigir autenticacao.

**Arquivo**: `supabase/functions/whatsapp/index.ts`

1. **Adicionar deteccao automatica de webhook** (apos parsear o body, antes do check de `action`):
   - Se o body contiver `event` e `instance` mas nao `action`, tratar como webhook automaticamente
   - Definir `action = 'webhook'` e reformatar o body para o formato esperado pela funcao `handleWebhook`

2. **Mudanca especifica** nas linhas 82-89:
   - Apos `const body = await req.json()`, verificar: se `body.event` e `body.instance` existem e `body.action` nao existe, entao e um webhook da Evolution API
   - Nesse caso, chamar `handleWebhook()` diretamente com o body formatado como `WebhookRequest`

3. **Nenhuma outra alteracao necessaria** — o handler de webhook (`handleWebhook`) ja esta correto e processa os eventos `QRCODE_UPDATED` e `CONNECTION_UPDATE` corretamente.

### Resumo

| Item | Detalhe |
|---|---|
| Arquivo alterado | `supabase/functions/whatsapp/index.ts` |
| Linhas afetadas | ~82-89 (deteccao de webhook) |
| Causa | Evolution API nao envia `action: "webhook"` no body |
| Correcao | Detectar webhooks pelo formato `{event, instance, data}` |
| Impacto | Apenas o fluxo de recebimento de webhook |
