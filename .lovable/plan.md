

## Plano: Lista Dinâmica de Itens no Template (3 linhas por produto)

### Resumo

Vou implementar suporte a **loops dinâmicos** do Docxtemplater para que o template Word possa listar uma quantidade variável de itens, cada um com 3 linhas:
1. **Nome do produto**
2. **Descrição breve**
3. **Valor**

---

### O Problema Atual

O sistema usa `{{tabela_itens}}` como um campo de texto simples, que insere todo o conteúdo como uma string única. Isso não permite:
- Formatação individual de cada item
- Layout personalizado no Word
- Suporte dinâmico a N itens

---

### A Solução: Sintaxe de Loop do Docxtemplater

O Docxtemplater suporta uma sintaxe especial para loops sobre arrays:

```text
{#items}
Nome: {nome}
Descrição: {descricao}
Valor: {valor}
{/items}
```

Onde `items` é um array de objetos e `{nome}`, `{descricao}`, `{valor}` são campos de cada objeto.

---

### Como o Template Word Deve Ficar

No seu arquivo `.docx`, você vai usar esta estrutura:

```text
{#itens}
{nome}
{descricao}
{valor}

{/itens}

Valor Total: {{valor_total}}
```

O Docxtemplater irá repetir automaticamente as 3 linhas para cada item da proposta.

---

### Mudanças Técnicas

#### 1. Edge Function (`supabase/functions/generate-pdf/index.ts`)

**a) Buscar descrição do item original**

Atualmente, `proposal_items` não tem descrição. Vou buscar a descrição da tabela `items` através do `item_id`:

```sql
-- Query atualizada
SELECT pi.*, i.description as item_description
FROM proposal_items pi
LEFT JOIN items i ON pi.item_id = i.id
WHERE pi.proposal_id = ?
```

**b) Criar array `itens` para o loop**

```javascript
const itensArray = items.map((item, index) => ({
  nome: item.item_name || '',
  descricao: item.item_description || '',
  valor: formatCurrency(Number(item.subtotal)),
  // Campos extras opcionais
  quantidade: item.quantity,
  valor_unitario: formatCurrency(Number(item.item_price)),
  desconto: Number(item.discount) > 0 ? `${item.discount}%` : '',
  indice: index + 1,
}));
```

**c) Atualizar `templateData`**

```javascript
const templateData = {
  // ... campos existentes ...
  itens: itensArray,  // Array para o loop
  tabela_itens: generateItemsTable(items, totalValue),  // Fallback texto
};
```

---

#### 2. Interface do Template (Atualizar documentação)

Atualizar a lista de campos dinâmicos em `src/pages/Templates.tsx` para incluir:

| Campo | Descrição |
|-------|-----------|
| `{#itens}...{/itens}` | Loop para repetir bloco de itens |
| `{nome}` | Nome do item (dentro do loop) |
| `{descricao}` | Descrição breve do item (dentro do loop) |
| `{valor}` | Valor/subtotal do item (dentro do loop) |
| `{quantidade}` | Quantidade (dentro do loop) |
| `{valor_unitario}` | Valor unitário (dentro do loop) |
| `{desconto}` | Desconto aplicado (dentro do loop) |
| `{indice}` | Número do item (1, 2, 3...) |

---

### Exemplo Prático

**Dados da Proposta:**
```json
{
  "itens": [
    { "nome": "S50", "descricao": "Sistema de monitoramento marítimo", "valor": "R$ 59.000,00" },
    { "nome": "GPS Pro", "descricao": "Navegador de alta precisão", "valor": "R$ 12.500,00" }
  ]
}
```

**Template Word:**
```text
PRODUTOS INCLUSOS:

{#itens}
• {nome}
  {descricao}
  Valor: {valor}

{/itens}

VALOR TOTAL: {{valor_total}}
```

**Resultado no PDF:**
```text
PRODUTOS INCLUSOS:

• S50
  Sistema de monitoramento marítimo
  Valor: R$ 59.000,00

• GPS Pro
  Navegador de alta precisão
  Valor: R$ 12.500,00

VALOR TOTAL: R$ 71.500,00
```

---

### Correção do "undefined"

Vou garantir que todos os campos tenham valores padrão (string vazia) quando não preenchidos:

```javascript
// Sanitização de todos os campos
Object.keys(templateData).forEach(key => {
  if (templateData[key] === undefined || templateData[key] === null) {
    templateData[key] = '';
  }
});
```

---

### Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Buscar descrição do item, criar array `itens` com campos formatados, sanitizar undefined |
| `src/pages/Templates.tsx` | Adicionar documentação dos novos campos de loop |

---

### Próximos Passos do Usuário

Após a implementação, você precisará atualizar seu template `.docx` para usar a nova sintaxe:

1. Remover `{{tabela_itens}}`
2. Adicionar o bloco de loop:
   ```text
   {#itens}
   {nome}
   {descricao}
   {valor}
   
   {/itens}
   ```
3. Fazer upload do novo template
4. Testar a geração do PDF

