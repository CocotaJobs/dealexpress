
## Diagnóstico: Por que o QR Code não está sendo gerado

### O que foi encontrado

Testando diretamente o backend, a resposta para `action: "create"` foi:
```json
{ "success": true, "connected": false, "instanceName": "user_..." }
```
Ou seja: `qrcode` ausente. O frontend detecta isso e exibe "QR Code não recebido".

E o status atual da instância é:
```json
{ "connected": false, "state": "connecting" }
```

### Causa raiz

O problema tem **duas camadas**:

**Camada 1 — Instância presa em "connecting"**: A Evolution API mantém uma instância criada anteriormente num estado `"connecting"` (nem conectada, nem desconectada). Quando o usuário tenta gerar um novo QR Code, a função detecta que a instância existe e tenta buscar o QR via `GET /instance/connect/{name}`. Porém a Evolution API pode não retornar o QR nesse endpoint se a instância não foi reiniciada.

**Camada 2 — Lógica de fallback incompleta**: Quando a instância existe mas não está `"open"`, o código faz `GET /instance/connect/{instanceName}` mas **não trata o caso em que a Evolution API não devolve o QR imediatamente** (já que o QR ainda está sendo gerado de forma assíncrona). Nessa situação, `qrData.base64` e `qrData.qrcode?.base64` são ambos `undefined`, resultando em `qrcode: undefined` na resposta — e o frontend joga o erro.

### Solução

Reescrever a função `handleCreate` no backend com a seguinte lógica robusta:

```text
1. Checar estado atual da instância
   ├── "open" → já conectada, retornar success
   └── qualquer outro estado (connecting, close, etc.)
       ├── DELETAR a instância existente (logout + delete)
       └── Aguardar 1 segundo
           └── CRIAR nova instância → retorna QR garantido
```

**Por que deletar e recriar?** É a única forma confiável de obter um novo QR Code válido da Evolution API. Tentar reconectar uma instância presa em "connecting" raramente funciona, e o QR gerado pode ser inválido ou nunca chegar.

### Arquivos a alterar

**Apenas 1 arquivo**: `supabase/functions/whatsapp/index.ts`

Especificamente a função `handleCreate` (linhas 151–276):
- Adicionar lógica de delete antes de recriar (quando o estado não é "open")
- Adicionar log detalhado do retorno da Evolution API para facilitar debug futuro
- Adicionar tratamento de caso em que o QR não vem imediatamente na criação (aguardar e tentar buscar via `/instance/connect/`)
- Garantir que a resposta sempre retorne `qrcode` ou um erro claro

### Impacto

- Nenhuma alteração no banco de dados
- Nenhuma alteração no frontend
- Nenhuma alteração em RLS ou segurança
- O comportamento para usuários já conectados (`"open"`) permanece idêntico
- André e João Vitor poderão gerar o QR Code normalmente
