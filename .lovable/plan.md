

## Plano: Corrigir Erro "Duplicate Open Tag" na Geração de PDF

### Problema Identificado

O erro persiste porque a função `fixFragmentedTags` atual não está funcionando corretamente. O Microsoft Word está dividindo a tag `{{data}}` em múltiplos elementos XML separados, como:

```xml
<w:r><w:t>{{</w:t></w:r><w:r><w:t>data</w:t></w:r><w:r><w:t>}}</w:t></w:r>
```

Isso faz com que o `docxtemplater` veja `{{` e `{{` como duas aberturas de tag diferentes, gerando o erro "Duplicate open tag".

### Solução Proposta

Vou implementar uma nova abordagem com duas camadas de proteção:

| Camada | Descrição |
|--------|-----------|
| 1. Pré-processamento de texto | Antes do docxtemplater, juntar TODO o texto de cada parágrafo em um único `<w:t>` |
| 2. Delimitadores únicos | Usar delimitadores de caractere único (`{` e `}`) em vez de duplos (`{{` e `}}`) para evitar fragmentação |

### Detalhes Técnicos

#### 1. Nova função `mergeRunsInParagraph`

Criar uma nova função que:
- Identifica todos os parágrafos (`<w:p>`) que contêm possíveis tags de template (procurando por `{` e `}`)
- Para cada parágrafo identificado, extrai TODO o texto de todos os elementos `<w:t>`
- Reconstrói o parágrafo com um único `<w:r>` contendo todo o texto consolidado
- Preserva as propriedades de parágrafo (`<w:pPr>`)

#### 2. Alterar delimitadores do docxtemplater

Configurar o docxtemplater para usar delimitadores de caractere único:
```javascript
delimiters: { start: '{', end: '}' }
```

Isso reduz drasticamente a chance de fragmentação, já que `{` e `}` são caracteres únicos.

#### 3. Atualizar documentação de tags

As tags no template passam a usar chaves simples:
- `{cliente_nome}` em vez de `{{cliente_nome}}`
- `{data}` em vez de `{{data}}`
- `{#itens}...{/itens}` (loops já usam chaves simples)

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Substituir `fixFragmentedTags` por `mergeRunsInParagraph`, adicionar configuração `delimiters: { start: '{', end: '}' }` |

### Código da Solução

**Nova função `mergeRunsInParagraph`:**
```javascript
function mergeRunsInParagraph(xmlContent: string): string {
  // Processa cada parágrafo individualmente
  return xmlContent.replace(
    /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,
    (paragraph) => {
      // Verifica se o parágrafo contém possíveis delimitadores de template
      if (!paragraph.includes('{') && !paragraph.includes('}')) {
        return paragraph;
      }
      
      // Extrai todo o texto dos elementos <w:t>
      const textMatches = [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
      if (textMatches.length <= 1) {
        return paragraph; // Já está consolidado
      }
      
      const fullText = textMatches.map(m => m[1]).join('');
      
      // Se não há delimitadores de template no texto combinado, não precisa modificar
      if (!fullText.includes('{') && !fullText.includes('}')) {
        return paragraph;
      }
      
      // Preserva propriedades do parágrafo
      const pPrMatch = paragraph.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
      const pPr = pPrMatch ? pPrMatch[0] : '';
      
      // Reconstrói o parágrafo com um único <w:r> contendo todo o texto
      return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${fullText}</w:t></w:r></w:p>`;
    }
  );
}
```

**Atualização na criação do Docxtemplater:**
```javascript
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  delimiters: { start: '{', end: '}' }, // Delimitadores simples
});
```

### Template Atualizado

Com esta mudança, o template passa a usar chaves simples:

| Antes (não funciona) | Depois (funciona) |
|---------------------|-------------------|
| `{{cliente_nome}}` | `{cliente_nome}` |
| `{{data}}` | `{data}` |
| `{{valor_total}}` | `{valor_total}` |

Os loops já usam a sintaxe correta: `{#itens}...{/itens}`

### Vantagens desta Abordagem

1. **Menos fragmentação**: Caracteres únicos são menos propensos a serem divididos pelo Word
2. **Pré-processamento robusto**: Consolida o texto antes do parsing, evitando erros de "duplicate tag"
3. **Compatibilidade**: A sintaxe `{tag}` é mais simples e intuitiva para os usuários

### Passo do Usuário

Após a implementação, você precisará:
1. Atualizar seu template Word para usar chaves simples (`{data}` em vez de `{{data}}`)
2. Fazer upload do template atualizado
3. Testar a geração de PDF

