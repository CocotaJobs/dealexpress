

# Correção: Rotas 404 + Qualidade do PDF Gerado

## Problemas Identificados

### 1. Erro 404 nas Rotas de Proposta
As rotas `/proposals/:id` (visualizar) e `/proposals/:id/edit` (editar) **não existem** no `App.tsx`, causando erro 404 ao clicar nos links.

### 2. PDF Não Parece com o Template DOCX
O pipeline atual de geração de PDF tem duas limitações:
- **Mammoth.js** converte DOCX → HTML muito simplificado (perde formatação rica)
- **`generatePdfFromHtmlContent()`** é primitivo - apenas extrai texto bruto e gera um PDF básico com fonte Courier

Resultado: o PDF gerado é basicamente texto plano, ignorando fontes, cores, tabelas e layout do template original.

## Solução Proposta

### Parte 1: Criar Páginas de Visualização/Edição

Criar duas novas páginas e adicionar rotas:

**Arquivos novos:**
- `src/pages/ViewProposal.tsx` - página de visualização de proposta
- `src/pages/EditProposal.tsx` - página de edição (baseada em NewProposal)

**Modificar:**
- `src/App.tsx` - adicionar rotas:
  - `/proposals/:id` → ViewProposal
  - `/proposals/:id/edit` → EditProposal

### Parte 2: Melhorar Qualidade do PDF

**Estratégia:** Usar uma API de conversão profissional para transformar HTML em PDF com alta qualidade.

Opções avaliadas:
1. **Gotenberg** - requer setup de container Docker
2. **API externa gratuita** - limitações de uso
3. **pdf-lib + HTML melhor estruturado** - mais controle, sem dependência externa

**Solução escolhida:** Melhorar significativamente o HTML gerado pelo mammoth e usar uma função de geração de PDF mais robusta com `pdf-lib`.

**Modificações em `supabase/functions/generate-pdf/index.ts`:**

1. **Melhorar conversão HTML**:
   - Adicionar estilos CSS inline mais ricos
   - Preservar estrutura de tabelas
   - Manter formatação de cabeçalhos

2. **Usar pdf-lib** para gerar PDF de melhor qualidade:
   - Suporte a múltiplas páginas
   - Fontes embutidas
   - Melhor controle de layout

3. **Alternativa**: Usar API gratuita como `html2pdf.app` que aceita HTML e retorna PDF formatado

## Detalhes Técnicos

### Nova Rota: ViewProposal.tsx

Exibirá:
- Dados do cliente
- Tabela de itens
- Valor total
- Status da proposta
- Botões de ação (Editar, Baixar PDF, Enviar)

### Nova Rota: EditProposal.tsx

- Carrega dados existentes da proposta
- Permite modificar cliente, itens e condições
- Salva alterações no banco

### Melhorias na Edge Function

```text
Fluxo Atual (problema):
DOCX → Mammoth → HTML simples → Texto bruto → PDF feio

Fluxo Proposto:
DOCX → Mammoth → HTML estilizado → pdf-lib → PDF formatado
```

**Importação adicional:**
```typescript
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
```

**Nova função `generatePdfWithPdfLib()`:**
- Processa o HTML/texto de forma estruturada
- Cria páginas A4
- Aplica fontes legíveis (Helvetica)
- Mantém layout com margens adequadas
- Suporta quebras de página automáticas

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/ViewProposal.tsx` | Criar | Página de visualização |
| `src/pages/EditProposal.tsx` | Criar | Página de edição |
| `src/App.tsx` | Modificar | Adicionar rotas |
| `supabase/functions/generate-pdf/index.ts` | Modificar | Melhorar geração de PDF |
| `src/hooks/useProposals.ts` | Modificar | Adicionar função `updateProposal` |

## Resultado Esperado

1. **Rotas funcionando**: Clicar em "Visualizar" e "Editar" abre as páginas corretas
2. **PDF melhor qualidade**: Documento gerado mantém estrutura, fontes e layout mais próximo do template
3. **Edição funcional**: Possível modificar propostas em rascunho

## Limitações

- A conversão DOCX → PDF em Edge Functions sem LibreOffice sempre terá perdas de formatação
- Para 100% de fidelidade ao template Word, seria necessário:
  - API externa paga (CloudConvert, ConvertAPI)
  - Ou servidor com LibreOffice instalado
- A solução proposta melhora significativamente a qualidade mas não será pixel-perfect

