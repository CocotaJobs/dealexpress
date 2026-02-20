
## Causa Raiz Confirmada

O fluxo atual no `handleCreate` faz:

1. Verifica estado da instância
2. Se não estiver `"open"` → deleta instância antiga
3. `POST /instance/create` → instância é criada mas permanece em estado `"close"`
4. Aguarda webhook `QRCODE_UPDATED` → **nunca chega**, pois a instância está parada

**A chamada `POST /instance/connect/{instanceName}` está ausente.** Na Evolution API com Baileys, `create` apenas registra a instância internamente. É o `connect` que inicia o processo de autenticação WhatsApp e desencadeia os eventos `CONNECTION_UPDATE` (estado: `"connecting"`) e `QRCODE_UPDATED`.

---

## Fluxo Correto (após a correção)

```text
handleCreate:
  1. GET /instance/connectionState/{name}
     ├── "open"    → retornar "já conectado"
     └── outro     → logout + delete + aguardar 1s

  2. POST /instance/create
     └── instância criada em estado "close"

  3. POST /instance/connect/{name}   ← STEP AUSENTE HOJE
     └── instância vai para "connecting"
     └── Evolution API dispara QRCODE_UPDATED via webhook

  4. Retornar { waiting: true } ao frontend

  5. Frontend faz polling (a cada 3s) chamando action: 'status'
     └── handleStatus lê whatsapp_qr_code do banco
     └── retorna QR ao frontend para exibir
```

---

## Alterações Necessárias

### Arquivo: `supabase/functions/whatsapp/index.ts`

**Somente na função `handleCreate`**, adicionar chamada `POST /instance/connect/{instanceName}` logo após o `POST /instance/create`:

**Passo 1** — Após confirmar que `createResponse.ok`, chamar:
```ts
// Após criar a instância, iniciar a conexão para gerar QR Code
console.log(`Initiating connect for instance: ${instanceName}`);
const connectResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
  method: 'GET',  // Evolution API v2 usa GET para /instance/connect
  headers: {
    'apikey': evolutionKey,
    'Content-Type': 'application/json',
  },
});
const connectData = await connectResponse.json().catch(() => ({}));
console.log(`Connect response (${connectResponse.status}):`, JSON.stringify(connectData));
```

**Importante sobre o método HTTP:** A Evolution API v2 (Baileys) usa `GET /instance/connect/{instanceName}` — não `POST`. O retorno pode já incluir um QR Code diretamente no campo `base64` se a API gerar de forma síncrona, ou o QR chegará via webhook `QRCODE_UPDATED`.

**Passo 2** — Verificar se o QR Code já veio na resposta do connect:
```ts
const immediateQrcode =
  connectData.base64 ||
  connectData.qrcode?.base64 ||
  createData.qrcode?.base64 ||
  createData.qrcode?.qrcode?.base64 ||
  createData.base64 ||
  null;
```

**Passo 3** — Se o connect retornar erro (non-ok), logar mas **não falhar** — o QR ainda chegará via webhook:
```ts
if (!connectResponse.ok) {
  console.warn(`Connect call returned ${connectResponse.status} — QR will arrive via webhook`);
}
```

**Passo 4** — Salvar no banco e retornar `waiting: true` (ou o QR imediato se disponível):
```ts
await supabaseAdmin
  .from('profiles')
  .update({
    whatsapp_session_id: instanceName,
    whatsapp_connected: false,
    whatsapp_qr_code: immediateQrcode || null,
  })
  .eq('id', userId);

return new Response(
  JSON.stringify({
    success: true,
    connected: false,
    qrcode: immediateQrcode,
    waiting: !immediateQrcode,
    instanceName,
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

## Resumo do que muda

| Item | Antes | Depois |
|---|---|---|
| `POST /instance/create` | Sim | Sim |
| `GET /instance/connect/{name}` | Não | **Sim — adicionado** |
| QR Code via webhook | Nunca chegava | Chegará após connect |
| Estado da instância | Permanecia `"close"` | Vai para `"connecting"` → `"qr"` |
| Arquivo alterado | — | `supabase/functions/whatsapp/index.ts` |
| Alterações no banco | Nenhuma | Nenhuma |
| Alterações no frontend | Nenhuma | Nenhuma |
| Alterações em RLS | Nenhuma | Nenhuma |

---

## Detalhe Técnico

A função `handleCreate` atual tem **293 linhas** (linhas 152–291 no arquivo). A mudança está concentrada entre as linhas 256–290 — apenas inserir a chamada de connect e atualizar a lógica de extração do QR Code para considerar também a resposta do connect.

Nenhuma outra função (`handleStatus`, `handleWebhook`, `handleDisconnect`, `handleSendMessage`) precisa ser alterada.
