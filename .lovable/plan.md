
# Importação de Itens via Planilha (Excel/CSV)

## Objetivo
Implementar funcionalidade para importar itens em massa a partir de arquivos Excel (.xlsx) ou CSV, com validação prévia e preview antes de confirmar a importação.

## Fluxo do Usuário

```text
+------------------+     +------------------+     +------------------+     +------------------+
|   Upload do      |     |   Parsing do     |     |   Preview com    |     |   Confirmação    |
|   Arquivo        |---->|   Arquivo        |---->|   Validação      |---->|   e Inserção     |
+------------------+     +------------------+     +------------------+     +------------------+
        |                        |                        |                        |
  .xlsx ou .csv           Extrai linhas          Mostra tabela com       Insere no banco
  Máx 5MB                 e colunas              erros destacados        em lote
                                                 Permite editar
```

## Arquivos a Criar/Modificar

### 1. Novo Componente: `src/components/items/ImportItemsDialog.tsx`

Dialog completo para importação com:
- Área de upload (drag & drop)
- Instruções e modelo de planilha para download
- Preview da tabela com validação
- Contagem de itens válidos/inválidos
- Botão de confirmar importação

### 2. Novo Hook: `src/hooks/useItemsImport.ts`

Hook para gerenciar a lógica de importação:
- Parsing de CSV (nativo com `FileReader`)
- Parsing de Excel (usando biblioteca `xlsx`)
- Validação com Zod
- Inserção em lote no Supabase

### 3. Modificar: `src/pages/Items.tsx`

Adicionar:
- Botão "Importar Planilha" ao lado de "Novo Item"
- Integração com o novo dialog

### 4. Arquivo modelo: Download dinâmico

Gerar CSV/Excel modelo com colunas corretas para o usuário baixar.

## Detalhes Técnicos

### Dependência Necessária
Precisamos instalar `xlsx` para ler arquivos Excel:
```bash
npm install xlsx
```

### Estrutura do Arquivo de Importação

| nome* | tipo | categoria | preco* | desconto_max | descricao | ficha_tecnica |
|-------|------|-----------|--------|--------------|-----------|---------------|
| Produto A | product | Ferramentas | 199.90 | 10 | Descrição breve | Especificações |
| Serviço B | service | Instalação | 500.00 | 5 | | |

*Campos obrigatórios

### Validação com Zod

```typescript
const importItemSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(100),
  tipo: z.enum(['product', 'service']).default('product'),
  categoria: z.string().optional(),
  preco: z.number().min(0, 'Preço deve ser positivo'),
  desconto_max: z.number().min(0).max(100).default(0),
  descricao: z.string().max(200).optional(),
  ficha_tecnica: z.string().optional(),
});
```

### Estados do Preview

1. **Válido**: Linha verde, pronta para importar
2. **Aviso**: Linha amarela, campo opcional com problema (importa mesmo assim)
3. **Erro**: Linha vermelha, campo obrigatório inválido (não importa)

### Fluxo de Categorias

- Se o nome da categoria existir no banco: usa o ID existente
- Se não existir: cria a categoria automaticamente
- Se vazio: deixa `category_id` como null

### Inserção em Lote

```typescript
// Usa transação para inserir todos de uma vez
const { data, error } = await supabase
  .from('items')
  .insert(validItems.map(item => ({
    name: item.nome,
    type: item.tipo,
    category_id: categoryMap[item.categoria] || null,
    price: item.preco,
    max_discount: item.desconto_max,
    description: item.descricao,
    technical_specs: item.ficha_tecnica,
    organization_id: orgId,
  })));
```

## Interface do Dialog

```text
+----------------------------------------------------------+
|  Importar Itens via Planilha                        [X]  |
+----------------------------------------------------------+
|                                                          |
|  [Baixar Modelo Excel]  [Baixar Modelo CSV]              |
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |     📄 Arraste seu arquivo aqui                    |  |
|  |        ou clique para selecionar                   |  |
|  |                                                    |  |
|  |        .xlsx ou .csv (máx 5MB)                     |  |
|  +----------------------------------------------------+  |
|                                                          |
+----------------------------------------------------------+
| (Após upload - Preview)                                  |
+----------------------------------------------------------+
|                                                          |
|  📊 Preview da Importação                                |
|  ✅ 45 itens válidos  ⚠️ 3 com avisos  ❌ 2 com erros    |
|                                                          |
|  +----------------------------------------------------+  |
|  | # | Nome      | Tipo    | Preço  | Status         |  |
|  +----------------------------------------------------+  |
|  | 1 | Produto A | product | 199.90 | ✅ Válido       |  |
|  | 2 | Serviço B | service | 500.00 | ✅ Válido       |  |
|  | 3 | Item C    | erro    |   -    | ❌ Tipo inválido|  |
|  +----------------------------------------------------+  |
|                                                          |
|  [Cancelar]                    [Importar 45 itens]       |
+----------------------------------------------------------+
```

## Implementação Passo a Passo

1. **Instalar dependência `xlsx`**
   
2. **Criar hook `useItemsImport.ts`**
   - Função `parseFile(file)` - detecta tipo e faz parsing
   - Função `validateRows(rows)` - valida com Zod
   - Função `importItems(validRows)` - insere no banco
   - Estado para linhas parseadas, erros, loading

3. **Criar componente `ImportItemsDialog.tsx`**
   - Área de upload com drag & drop
   - Botões para baixar modelo
   - Tabela de preview com scroll
   - Indicadores de status por linha
   - Ações de cancelar/confirmar

4. **Integrar na página `Items.tsx`**
   - Adicionar botão ao lado de "Novo Item"
   - Controlar abertura do dialog
   - Refresh da lista após importação

5. **Criar categorias automaticamente**
   - Buscar categorias existentes
   - Criar as que não existem
   - Mapear nomes para IDs

## Considerações

- **Limite de linhas**: Máximo 500 itens por importação
- **Limite de arquivo**: Máximo 5MB
- **Encoding CSV**: Detectar UTF-8 e Latin-1 (ISO-8859-1)
- **Separador CSV**: Detectar `,` ou `;` automaticamente
- **Números**: Aceitar formato brasileiro (1.234,56) e internacional (1,234.56)

## Resultado Esperado

O usuário poderá:
1. Baixar um modelo de planilha pronto
2. Preencher com seus itens
3. Fazer upload do arquivo
4. Ver preview com validação visual
5. Corrigir erros se necessário (re-upload)
6. Confirmar importação
7. Ver toast com resultado final
