
## Plano: Preservar Espaços Múltiplos e Tabs na Geração de PDF

### Problema Identificado

O Microsoft Word armazena espaços em branco de duas formas diferentes:

1. **Espaços normais**: Ficam dentro de `<w:t>texto</w:t>`
2. **Espaços significativos (múltiplos espaços, tabs, espaços no início/fim)**: O Word usa o atributo `xml:space="preserve"` OU elementos especiais como `<w:tab/>` para tabulações

A regex atual extrai apenas o conteúdo de `<w:t>`:
```javascript
const textMatches = [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
```

Isso **ignora** elementos importantes:
- `<w:tab/>` - Representação de tabs no Word
- Espaços entre elementos `<w:t>` quando o Word fragmenta o texto
- Elementos `<w:t xml:space="preserve"> </w:t>` que preservam espaços

### Exemplo do Problema

No template Word, você tem:
```
Nome:    João Silva
```
(com vários espaços entre "Nome:" e "João")

O Word armazena assim:
```xml
<w:r><w:t>Nome:</w:t></w:r>
<w:r><w:t xml:space="preserve">    </w:t></w:r>
<w:r><w:t>{cliente_nome}</w:t></w:r>
```

O código atual extrai: `"Nome:" + "    " + "{cliente_nome}"` = `"Nome:    {cliente_nome}"` ✅

Mas para tabs, o Word usa:
```xml
<w:r><w:t>Nome:</w:t></w:r>
<w:r><w:tab/></w:r>
<w:r><w:t>{cliente_nome}</w:t></w:r>
```

O código atual **ignora `<w:tab/>`** e produz: `"Nome:{cliente_nome}"` ❌

### Solução Proposta

Atualizar a função `mergeRunsInParagraph` para:
1. Detectar e substituir elementos `<w:tab/>` por um caractere de tab (`\t`)
2. Preservar todos os espaços em elementos `<w:t xml:space="preserve">`

### Detalhes Técnicos

#### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Atualizar `mergeRunsInParagraph` para preservar tabs e espaços múltiplos |

#### Código Atual (linha 170):
```javascript
const fullText = textMatches.map(m => m[1]).join('');
```

#### Código Corrigido:
```javascript
// Replace <w:tab/> with actual tab character before extracting text
let processedParagraph = paragraph.replace(/<w:tab\s*\/>/g, '<w:t>\t</w:t>');

// Extract all text from <w:t> elements (now includes converted tabs)
const textMatches = [...processedParagraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
if (textMatches.length <= 1) {
  return paragraph; // Already consolidated or only one text node
}

const fullText = textMatches.map(m => m[1]).join('');
```

### Lógica Detalhada

1. **Antes de extrair texto**: Converter `<w:tab/>` em `<w:t>\t</w:t>` para que seja capturado pela regex
2. **Extrair texto**: A regex existente captura normalmente
3. **Reconstruir**: O `xml:space="preserve"` já está sendo aplicado, então os tabs e espaços serão preservados

### Resultado Esperado

| Template | Antes (espaços perdidos) | Depois (espaços preservados) |
|----------|--------------------------|------------------------------|
| `Nome:⇥João` | `Nome:João` | `Nome:	João` |
| `Valor:    R$` | `Valor: R$` | `Valor:    R$` |

### Ação Necessária do Usuário

Após a implementação:
1. Não é necessário alterar o template
2. Gere o PDF novamente
3. Verifique se os espaços múltiplos e tabs estão sendo preservados
