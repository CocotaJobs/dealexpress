
## Plano: Preservar Formatação (Negrito, Itálico, etc.) na Geração de PDF

### Problema Identificado

A função `mergeRunsInParagraph` consolida o texto de parágrafos fragmentados para corrigir erros de "Duplicate open tag", mas ao fazer isso, ela descarta as propriedades de formatação (`<w:rPr>`) dos runs originais.

Estrutura original do Word com negrito:
```xml
<w:r>
  <w:rPr><w:b/></w:rPr>  <!-- w:b = negrito -->
  <w:t>{cliente_nome}</w:t>
</w:r>
```

Estrutura atual após o merge (perde negrito):
```xml
<w:r>
  <w:t xml:space="preserve">{cliente_nome}</w:t>
</w:r>
```

### Solução Proposta

Modificar a função `mergeRunsInParagraph` para detectar e preservar as propriedades de formatação do primeiro run que contém texto, aplicando-as ao run consolidado.

### Detalhes Técnicos

#### Código Atual (linha 189):
```javascript
return `${pOpen}${pPr}<w:r><w:t xml:space="preserve">${fullText}</w:t></w:r></w:p>`;
```

#### Código Corrigido:
```javascript
// Extrair <w:rPr> do primeiro run que contém texto
const rPrMatch = paragraph.match(/<w:r[^>]*>[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>[\s\S]*?<w:t/);
const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';

return `${pOpen}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${fullText}</w:t></w:r></w:p>`;
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Atualizar `mergeRunsInParagraph` para preservar `<w:rPr>` (propriedades de formatação) |

### Lógica Detalhada

A nova implementação:

1. Extrai todas as propriedades de formatação (`<w:rPr>`) encontradas nos runs do parágrafo
2. Usa as propriedades do primeiro run que possui formatação (assumindo que é a formatação dominante do placeholder)
3. Aplica essas propriedades ao run consolidado

### Resultado Esperado

| Antes (sem formatação) | Depois (com formatação preservada) |
|------------------------|-------------------------------------|
| `<w:r><w:t>{data}</w:t></w:r>` | `<w:r><w:rPr><w:b/></w:rPr><w:t>{data}</w:t></w:r>` |

### Limitação

Se um placeholder tiver formatação mista (ex: `{` normal + `cliente_nome` em negrito + `}` normal), a função aplicará a formatação do primeiro run a todo o texto consolidado. Na prática, isso funciona bem porque a maioria dos usuários formata o placeholder inteiro de forma uniforme.

### Ação Necessária do Usuário

Após a implementação:
1. Não é necessário alterar o template
2. Gere o PDF novamente
3. Verifique se a formatação (negrito, itálico) está preservada
