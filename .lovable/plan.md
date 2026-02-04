

# Correção do Bug de Formatação de Números com DDD 55

## Problema Identificado

Quando um número de telefone tem **DDD 55** (como nas cidades de Santa Maria, Uruguaiana, etc.), a lógica atual interpreta incorretamente o DDD como sendo o código do país Brasil (+55).

### Exemplo do Bug

| Número do Cliente | Após Limpar | Lógica Atual | Resultado Enviado | Correto? |
|---|---|---|---|---|
| (47) 98853-0718 | `47988530718` | Não começa com 55 → adiciona | `5547988530718` | ✓ |
| (55) 99123-4567 | `5599123456` | Já começa com 55 → não adiciona | `5599123456` | ✗ |

O número com DDD 55 fica com apenas 10-11 dígitos quando deveria ter 12-13, causando falha no envio.

## Solução

Melhorar a lógica de formatação para detectar corretamente se o número já inclui o código do país, baseando-se no **tamanho do número** ao invés de apenas verificar se começa com "55".

### Lógica Corrigida

Números brasileiros válidos:
- **Com código do país**: 12-13 dígitos (55 + DDD 2 dígitos + número 8-9 dígitos)
- **Sem código do país**: 10-11 dígitos (DDD 2 dígitos + número 8-9 dígitos)

```
SE comprimento >= 12 E começa com "55" → já tem código do país
SENÃO → adicionar "55"
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp/index.ts` | Corrigir lógica na função `handleSendMessage` |

## Código Atual vs Novo

### Atual (com bug)
```typescript
let formattedPhone = phone.replace(/\D/g, '');
if (!formattedPhone.startsWith('55')) {
  formattedPhone = '55' + formattedPhone;
}
```

### Corrigido
```typescript
let formattedPhone = phone.replace(/\D/g, '');

// Números brasileiros válidos:
// - Com código do país: 12-13 dígitos (55 + DDD + número)
// - Sem código do país: 10-11 dígitos (DDD + número)
// Só considera que já tem código do país se:
// 1. Começa com 55, E
// 2. Tem 12 ou mais dígitos (indicando que 55 é código do país, não DDD)
const hasCountryCode = formattedPhone.startsWith('55') && formattedPhone.length >= 12;

if (!hasCountryCode) {
  formattedPhone = '55' + formattedPhone;
}

console.log(`Phone formatted: ${phone} -> ${formattedPhone}`);
```

## Exemplos Após Correção

| Número Original | Dígitos | Começa com 55? | Tem ≥12 dígitos? | Resultado |
|---|---|---|---|---|
| (47) 98853-0718 | 11 | Não | - | `5547988530718` ✓ |
| (55) 99123-4567 | 11 | Sim | Não (11) | `555599123456` ✓ |
| 5547988530718 | 13 | Sim | Sim (13) | `5547988530718` ✓ |

## Passos de Implementação

1. Atualizar a função `handleSendMessage` em `supabase/functions/whatsapp/index.ts`
2. Adicionar logging para debug
3. Fazer deploy da Edge Function atualizada

