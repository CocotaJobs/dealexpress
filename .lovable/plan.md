

# Integração WhatsApp com Evolution API

## Resumo

A Evolution API permite **automatizar completamente** o processo de conexão WhatsApp. Cada usuário poderá conectar seu próprio WhatsApp diretamente pela aplicação, sem necessidade de pré-criar instâncias manualmente.

## Como Funcionará

```text
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Frontend       |---->|   Edge Function  |---->|   Evolution API  |
|   (WhatsApp.tsx) |     |   (whatsapp)     |     |   (seu servidor) |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        ^                        |                        |
        |                        v                        |
        |                +------------------+             |
        +<---------------|   Supabase DB    |<------------+
                         |   (profiles)     |   (webhook)
                         +------------------+
```

## Fluxo de Conexão

1. **Usuário clica em "Gerar QR Code"**
2. **Edge Function cria instância na Evolution API** usando o `user_id` como nome único
3. **Evolution API retorna QR Code** (base64 ou URL)
4. **Frontend exibe o QR Code** para o usuário escanear
5. **Webhook recebe evento CONNECTION_UPDATE** quando conectado
6. **Webhook atualiza profiles** no banco de dados (whatsapp_connected = true)
7. **Frontend detecta a mudança** e mostra status conectado

## Credenciais Necessárias

Você precisará fornecer apenas **2 credenciais globais** (não por usuário):

| Variável | Descrição |
|----------|-----------|
| `EVOLUTION_API_URL` | URL do seu servidor Evolution API (ex: `https://api.seudominio.com`) |
| `EVOLUTION_API_KEY` | API Key global para autenticação com a Evolution API |

Estas credenciais são do **administrador do sistema**, não dos usuários finais.

## Arquivos a Criar

### 1. Edge Function: `supabase/functions/whatsapp/index.ts`

Endpoints que serão implementados:

| Endpoint | Descrição |
|----------|-----------|
| `POST /create` | Cria instância e retorna QR Code |
| `GET /status` | Verifica status da conexão |
| `POST /disconnect` | Desconecta e remove instância |
| `POST /webhook` | Recebe eventos da Evolution API |
| `POST /send-message` | Envia mensagem/PDF para cliente |

### 2. Atualização: `src/pages/WhatsApp.tsx`

- Integrar com edge function para gerar QR code real
- Exibir imagem do QR code (base64)
- Polling ou realtime para detectar conexão
- Funções de desconectar e reconectar

### 3. Atualização: `src/contexts/AuthContext.tsx`

- Atualizar `refreshProfile` para buscar status do WhatsApp

## Detalhes Técnicos

### Criação de Instância (Evolution API v2)

```javascript
// POST {EVOLUTION_API_URL}/instance/create
{
  "instanceName": "user_{user_id}",      // Nome único baseado no user_id
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": true,                         // Gera QR automaticamente
  "webhook": {
    "url": "{SUPABASE_URL}/functions/v1/whatsapp/webhook",
    "events": ["CONNECTION_UPDATE", "QRCODE_UPDATED"]
  }
}
```

### Resposta com QR Code

```javascript
{
  "instance": {
    "instanceName": "user_abc123",
    "status": "created"
  },
  "qrcode": {
    "base64": "data:image/png;base64,..."  // Imagem do QR Code
  }
}
```

### Webhook CONNECTION_UPDATE

```javascript
{
  "event": "connection.update",
  "instance": "user_abc123",
  "data": {
    "state": "open"  // Conectado!
  }
}
```

## Banco de Dados

Os campos já existem na tabela `profiles`:
- `whatsapp_connected` (boolean) - Status da conexão
- `whatsapp_session_id` (string) - Nome da instância na Evolution

## Vantagens desta Abordagem

1. **100% Automatizado** - Usuários não precisam de acesso à Evolution API
2. **Multi-tenant** - Cada usuário tem sua própria instância isolada
3. **Seguro** - Credenciais ficam apenas no backend
4. **Escalável** - Suporta quantos usuários você precisar

## Próximos Passos

Após aprovar este plano:

1. Você informará as credenciais `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`
2. Criarei a edge function `whatsapp` com todos os endpoints
3. Atualizarei a página `WhatsApp.tsx` para usar a integração real
4. Configurarei o webhook na Evolution para receber eventos

