

## Correcao: Envio de Propostas via WhatsApp

### Problema diagnosticado

As Edge Functions `whatsapp` e `generate-pdf` possuem headers CORS incompletos. A versao atual do cliente Supabase JS (v2.93.3) envia headers adicionais (`x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`) que nao estao na lista de headers permitidos. Isso faz com que o navegador bloqueie a requisicao no preflight (OPTIONS), resultando em falha silenciosa.

A funcao `send-invitation` ja foi corrigida anteriormente e possui os headers corretos. As outras duas funcoes ficaram desatualizadas.

### Evidencia

- `send-invitation/index.ts` (linha 6) - CORRETO:
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

- `whatsapp/index.ts` (linha 5) - INCOMPLETO:
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

- `generate-pdf/index.ts` (linha 9) - INCOMPLETO:
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

### Correcao

Atualizar a constante `corsHeaders` em ambas as Edge Functions para incluir todos os headers necessarios:

1. **`supabase/functions/whatsapp/index.ts`** - Linha 5: atualizar `Access-Control-Allow-Headers` para incluir os 4 headers adicionais do cliente Supabase
2. **`supabase/functions/generate-pdf/index.ts`** - Linha 9: mesma atualizacao

### Impacto

- Nenhuma outra funcionalidade eh alterada
- Nenhuma mudanca em logica de negocio, autenticacao ou RLS
- Apenas headers CORS sao atualizados para permitir que o navegador complete o preflight
- Corrige tanto o envio de propostas via WhatsApp quanto a geracao de PDF (se estiver falhando tambem)

### Verificacao pos-correcao

- Testar envio de proposta via WhatsApp com o Andre
- Testar geracao/download de PDF
- Executar scan de seguranca

