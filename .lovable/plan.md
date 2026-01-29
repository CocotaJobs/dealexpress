
# Integração de Templates .docx Customizados para Geração de PDF

## Objetivo
Modificar a Edge Function `generate-pdf` para baixar e processar o template .docx ativo da organização, substituindo os campos dinâmicos pelos valores reais da proposta, e gerando um PDF formatado a partir do documento Word personalizado.

## Situação Atual

- Templates .docx são armazenados no bucket `templates` no Storage
- A tabela `templates` guarda metadados (nome, caminho, organização, ativo)
- A Edge Function `generate-pdf` usa um HTML hardcoded, ignorando os templates customizados
- Campos dinâmicos documentados: `{{cliente_nome}}`, `{{tabela_itens}}`, `{{valor_total}}`, etc.

## Fluxo Proposto

```text
+------------------+     +------------------+     +------------------+     +------------------+
|   Buscar         |     |   Baixar .docx   |     |   Substituir     |     |   Converter      |
|   Template Ativo |---->|   do Storage     |---->|   Campos         |---->|   para PDF       |
+------------------+     +------------------+     +------------------+     +------------------+
        |                        |                        |                        |
  Query na tabela           Download do            Usar biblioteca          Gerar PDF e
  templates                 arquivo               docx-templates           salvar no Storage
```

## Tratamento de Campos Não Utilizados

**Comportamento para campos ausentes no template:**
- Se o template não contiver `{{cliente_email}}`, simplesmente não será substituído nada
- Se o template contiver `{{cliente_email}}` mas o valor for vazio/null, o placeholder será removido (substituído por string vazia)
- A tabela de itens `{{tabela_itens}}` será gerada dinamicamente como texto formatado

## Arquivos a Modificar

### 1. Edge Function: `supabase/functions/generate-pdf/index.ts`

Mudanças principais:

1. **Buscar template ativo** da organização:
```typescript
const { data: template } = await supabaseAdmin
  .from('templates')
  .select('file_path')
  .eq('organization_id', proposal.organization_id)
  .eq('is_active', true)
  .single();
```

2. **Baixar arquivo .docx** do Storage:
```typescript
const { data: templateFile } = await supabaseAdmin
  .storage
  .from('templates')
  .download(template.file_path);
```

3. **Processar o .docx** substituindo campos dinâmicos:
   - Usar biblioteca `docx-templates` (compatível com Deno via esm.sh)
   - Mapear todos os campos para valores da proposta

4. **Converter para PDF**:
   - Usar `html2pdf` ou similar via API externa
   - Alternativa: converter docx para HTML primeiro, depois para PDF

5. **Fallback**: Se não houver template ativo, usar o HTML padrão atual

## Mapeamento de Campos Dinâmicos

| Campo | Valor |
|-------|-------|
| `{{cliente_nome}}` | `proposal.client_name` |
| `{{cliente_email}}` | `proposal.client_email \|\| ''` |
| `{{cliente_whatsapp}}` | `proposal.client_whatsapp \|\| ''` |
| `{{cliente_empresa}}` | `proposal.client_company \|\| ''` |
| `{{cliente_endereco}}` | `proposal.client_address \|\| ''` |
| `{{data}}` | Data formatada (dd/mm/yyyy) |
| `{{numero_proposta}}` | `proposal.proposal_number` |
| `{{vendedor_nome}}` | `vendor.name` |
| `{{vendedor_email}}` | `vendor.email` |
| `{{empresa_nome}}` | `organization.name` |
| `{{tabela_itens}}` | Texto formatado com lista de itens |
| `{{valor_total}}` | Valor total formatado (R$ X.XXX,XX) |
| `{{condicoes_pagamento}}` | `proposal.payment_conditions \|\| ''` |
| `{{validade_proposta}}` | `proposal.expires_at` formatado |
| `{{validade_dias}}` | `proposal.validity_days` |

## Detalhes Técnicos

### Biblioteca para Processar DOCX

Usaremos `docx-templates` via esm.sh:
```typescript
import createReport from 'https://esm.sh/docx-templates@4.11.4';
```

Esta biblioteca:
- Lê arquivos .docx
- Substitui placeholders `{campo}` ou `{{campo}}`
- Retorna o .docx modificado como Buffer

### Conversão DOCX para PDF

**Opção escolhida**: API CloudConvert ou LibreOffice Online

Como Deno Edge Functions não têm LibreOffice instalado, usaremos uma API externa gratuita ou converteremos para HTML primeiro:

1. **Mammoth.js** para DOCX -> HTML
2. **Puppeteer/html2pdf** para HTML -> PDF

Alternativa mais simples:
- Extrair texto do DOCX processado
- Gerar PDF usando o método atual (básico porém funcional)

### Formato da Tabela de Itens

```text
ITENS DA PROPOSTA
-----------------
1. Produto A
   Qtd: 2 x R$ 199,90 = R$ 399,80

2. Serviço B  
   Qtd: 1 x R$ 500,00 (-10%) = R$ 450,00

-----------------
TOTAL: R$ 849,80
```

## Implementação Passo a Passo

1. **Importar bibliotecas** necessárias no Deno (PizZip, docx-templates, mammoth)

2. **Criar função `processDocxTemplate`**:
   - Recebe: Buffer do .docx + dados da proposta
   - Retorna: Buffer do .docx processado

3. **Criar função `convertDocxToHtml`**:
   - Usa mammoth.js para converter
   - Retorna: HTML string

4. **Modificar fluxo principal**:
   - Tentar usar template customizado
   - Se falhar, usar HTML padrão (fallback)

5. **Atualizar geração de PDF**:
   - Usar HTML do docx convertido
   - Manter método de geração atual

## Considerações

- **Performance**: O processamento adiciona ~1-2 segundos
- **Compatibilidade**: Suporta .docx criados no Word, Google Docs, LibreOffice
- **Limitações**: Imagens no template podem não ser preservadas na conversão para PDF simples
- **Fallback**: Se não houver template ativo, usa o template HTML padrão do sistema

## Resultado Esperado

1. Admin faz upload de template .docx personalizado com os campos `{{campo}}`
2. Ao gerar PDF de uma proposta, o sistema:
   - Baixa o template .docx ativo
   - Substitui todos os campos pelos valores reais
   - Campos não preenchidos ficam vazios (não mostra `{{campo}}`)
   - Gera PDF mantendo a formatação básica do documento
3. PDF é salvo no Storage e link atualizado na proposta

