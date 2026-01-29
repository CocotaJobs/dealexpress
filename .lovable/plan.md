
# Adicionar Campo `{{data_extenso}}` à Lista de Campos Dinâmicos

## Problema Identificado

O campo `{{data_extenso}}` foi adicionado corretamente na Edge Function `generate-pdf`, mas a lista de campos dinâmicos exibida na página de Templates não foi atualizada para incluir esse novo campo.

## Solução

Adicionar o campo `{{data_extenso}}` à lista `dynamicFields` no arquivo `src/pages/Templates.tsx`.

## Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Templates.tsx` | Adicionar `{{data_extenso}}` na lista de campos dinâmicos (linha 26) |

## Código a ser adicionado

```typescript
const dynamicFields = [
  { field: '{{cliente_nome}}', description: 'Nome completo do cliente' },
  { field: '{{cliente_email}}', description: 'Email do cliente' },
  { field: '{{cliente_whatsapp}}', description: 'WhatsApp do cliente' },
  { field: '{{cliente_empresa}}', description: 'Nome da empresa do cliente' },
  { field: '{{cliente_endereco}}', description: 'Endereço do cliente' },
  { field: '{{data}}', description: 'Data de geração da proposta' },
  { field: '{{data_extenso}}', description: 'Data atual por extenso (ex: 29 de Janeiro de 2026)' },  // ← NOVO
  { field: '{{numero_proposta}}', description: 'Número único da proposta' },
  { field: '{{vendedor_nome}}', description: 'Nome do vendedor' },
  { field: '{{tabela_itens}}', description: 'Tabela com itens da proposta' },
  { field: '{{valor_total}}', description: 'Valor total da proposta' },
  { field: '{{condicoes_pagamento}}', description: 'Condições de pagamento' },
  { field: '{{validade_proposta}}', description: 'Data de validade' },
];
```

## Resultado Esperado

Após a implementação, o campo `{{data_extenso}}` aparecerá na seção "Campos Dinâmicos" da página de Templates com a descrição explicativa.
