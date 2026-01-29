
# Correção da Detecção de Conexão WhatsApp

## Problema Identificado

Após análise dos logs e do código, identifiquei que:

1. **Evolution API confirma conexão**: O status retorna `"state": "open"` (conectado)
2. **Banco de dados não foi atualizado**: `whatsapp_connected` permanece `false`
3. **Webhook não está chegando**: Não há logs de "Webhook received" - provavelmente a Evolution API não consegue acessar a URL do webhook (pode ser bloqueio de firewall, DNS, ou configuração)
4. **Polling detecta conexão, mas não atualiza o banco**: A função `handleStatus` apenas retorna o status sem fazer UPDATE no profiles

## Solução

Modificar a função `handleStatus` na Edge Function para **atualizar o banco de dados automaticamente** quando detectar que o WhatsApp está conectado. Isso elimina a dependência do webhook (que pode falhar por configurações de rede).

## Arquivos a Modificar

### `supabase/functions/whatsapp/index.ts`

**Mudanças necessárias:**

1. **Modificar a chamada de `handleStatus`** (no switch/case) para passar `userId` e `supabaseAdmin`

2. **Atualizar a função `handleStatus`** para:
   - Receber `userId` e `supabaseAdmin` como parâmetros
   - Quando `state === 'open'`, fazer UPDATE no profiles para `whatsapp_connected = true`
   - Retornar o status normalmente

## Código Atualizado

```javascript
// Na seção do switch case (linha ~117):
case 'status':
  return handleStatus(instanceName, userId, EVOLUTION_API_URL, EVOLUTION_API_KEY, supabaseAdmin);

// Função handleStatus atualizada:
async function handleStatus(
  instanceName: string,
  userId: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabaseAdmin: any
) {
  console.log(`Checking status for: ${instanceName}`);

  const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
    method: 'GET',
    headers: {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ connected: false, state: 'not_found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const data = await response.json();
  console.log('Status response:', data);

  const isConnected = data.instance?.state === 'open';

  // NOVO: Atualizar banco de dados quando conectado
  if (isConnected) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        whatsapp_connected: true,
        whatsapp_session_id: instanceName,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile on status check:', error);
    } else {
      console.log('Profile updated to connected via status check');
    }
  }

  return new Response(
    JSON.stringify({
      connected: isConnected,
      state: data.instance?.state || 'unknown',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Fluxo Após Correção

```text
+------------------+     +------------------+     +------------------+
|   Usuário        |     |   Frontend       |     |   Edge Function  |
|   escaneia QR    |     |   (polling)      |     |   (handleStatus) |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         |                        | POST status (a cada 3s)|
         |                        +----------------------->|
         |                        |                        | Consulta Evolution API
         |                        |                        | Detecta state="open"
         |                        |                        | UPDATE profiles SET
         |                        |                        | whatsapp_connected=true
         |                        |<-----------------------+
         |                        | connected: true        |
         |                        |                        |
         |                        | refreshProfile()       |
         |                        | Exibe "Conectado"      |
         |                        +                        |
+------------------+     +------------------+     +------------------+
```

## Por que não consertar o webhook?

O webhook depende de a Evolution API conseguir alcançar a URL do Supabase. Isso pode falhar por:
- Firewall na rede onde a Evolution API está hospedada
- Configuração de DNS
- Rate limiting

A solução via polling é mais robusta e não depende de configurações externas.

## Teste

Após a implementação:
1. Desconecte o WhatsApp atual (botão "Desconectar")
2. Gere um novo QR Code
3. Escaneie com o WhatsApp
4. O polling deve detectar a conexão e atualizar automaticamente a interface
