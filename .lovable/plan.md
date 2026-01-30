# ✅ Correção Concluída: Erro "Duplicate Open Tag" na Geração de PDF

## Alterações Implementadas

### 1. Nova função `mergeRunsInParagraph`
- Substitui a função `fixFragmentedTags` por uma abordagem mais robusta
- Consolida TODO o texto de parágrafos que contêm delimitadores de template em um único `<w:r>`
- Preserva propriedades de parágrafo (`<w:pPr>`)

### 2. Delimitadores únicos configurados
- Alterado para `delimiters: { start: '{', end: '}' }`
- Caracteres únicos são muito menos propensos a fragmentação pelo Word

## ⚠️ Ação Necessária do Usuário

Atualize seu template Word para usar **chaves simples**:

| Antes (não funciona) | Depois (funciona) |
|---------------------|-------------------|
| `{{cliente_nome}}` | `{cliente_nome}` |
| `{{data}}` | `{data}` |
| `{{valor_total}}` | `{valor_total}` |
| `{{numero_proposta}}` | `{numero_proposta}` |

Os loops já usam a sintaxe correta: `{#itens}...{/itens}`

### Tags disponíveis com a nova sintaxe:
- `{cliente_nome}`, `{cliente_cnpj}`, `{cliente_email}`, `{cliente_whatsapp}`, `{cliente_empresa}`, `{cliente_endereco}`
- `{data}`, `{data_extenso}`, `{numero_proposta}`
- `{vendedor_nome}`, `{vendedor_email}`, `{empresa_nome}`
- `{valor_total}`, `{condicoes_pagamento}`, `{validade_proposta}`, `{validade_dias}`
- Loop: `{#itens} {nome} - {valor} {/itens}`

