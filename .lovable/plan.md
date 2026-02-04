
# Plano de Implementação: Desconto por Valor e Campo de Frete

## Visão Geral

Duas novas funcionalidades para evitar valores quebrados e incluir informações de frete nas propostas:

1. **Desconto por Valor Fixo**: Opção de aplicar desconto como valor em R$ (além da porcentagem atual)
2. **Campo de Frete**: Novo campo dinâmico `{frete}` nos templates, com valor padrão configurável e personalização por proposta

---

## Funcionalidade 1: Desconto por Valor Fixo

### Problema Atual
O vendedor só consegue aplicar desconto em porcentagem. Quando o valor resultante fica quebrado (ex: R$ 1.234,57), ele precisa fazer cálculos mentais para encontrar a porcentagem exata que gera um valor redondo.

### Solução
Adicionar um toggle para escolher entre "Desconto em %" ou "Desconto em R$".

### Alterações no Banco de Dados

| Tabela | Coluna | Tipo | Descrição |
|--------|--------|------|-----------|
| `proposal_items` | `discount_type` | `TEXT` | `'percentage'` (padrão) ou `'fixed'` |

### Lógica de Cálculo

```text
SE discount_type = 'percentage':
   subtotal = quantidade * preco_unitario * (1 - desconto / 100)
SENÃO (discount_type = 'fixed'):
   subtotal = (quantidade * preco_unitario) - desconto
```

### Interface do Usuário

Alterar a coluna "Desconto (%)" na tabela de itens:

```text
┌─────────────────────────────────────────────────────────────┐
│ Item          │ Qtd │ Preço    │ Desconto       │ Subtotal  │
├─────────────────────────────────────────────────────────────┤
│ Produto X     │ 2   │ R$ 500   │ [%|R$] [50___] │ R$ 950,00 │
│ Produto Y     │ 1   │ R$ 1.200 │ [%|R$] [10___] │ R$ 1.080  │
└─────────────────────────────────────────────────────────────┘
```

O vendedor clica em `%` ou `R$` para alternar o tipo de desconto.

---

## Funcionalidade 2: Campo de Frete nas Propostas

### Estrutura

1. **Frete Padrão** (configurado por organização): Valor que será usado como padrão quando o vendedor não especificar
2. **Frete da Proposta** (personalizado): O vendedor pode sobrescrever o valor padrão ao criar/editar uma proposta

### Alterações no Banco de Dados

| Tabela | Coluna | Tipo | Descrição |
|--------|--------|------|-----------|
| `organizations` | `default_shipping` | `TEXT` | Texto padrão para o frete (ex: "A combinar", "Grátis", "R$ 150,00") |
| `proposals` | `shipping` | `TEXT` | Valor do frete específico desta proposta (pode ser null para usar o padrão) |

### Novo Campo Dinâmico no Template

| Campo | Descrição |
|-------|-----------|
| `{frete}` | Valor do frete da proposta (ou padrão da organização se não especificado) |

### Interface - Configurações (Admin)

Adicionar seção "Frete Padrão" na página de Configurações:

```text
┌─────────────────────────────────────────────────────────────┐
│ Configurações da Organização                                │
├─────────────────────────────────────────────────────────────┤
│ Frete Padrão: [_____________________________]               │
│ Será usado quando não for especificado na proposta          │
│ Ex: "A combinar", "Grátis", "R$ 150,00"                     │
└─────────────────────────────────────────────────────────────┘
```

### Interface - Nova Proposta / Editar Proposta

Adicionar campo na seção "Condições Comerciais":

```text
┌─────────────────────────────────────────────────────────────┐
│ Condições Comerciais                                        │
├─────────────────────────────────────────────────────────────┤
│ Condições de Pagamento: [___________________________]       │
│                                                             │
│ Frete:                                                      │
│ (•) Usar padrão: "A combinar"                               │
│ ( ) Personalizado: [___________________________]            │
│                                                             │
│ Validade da Proposta: [15_] dias                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

### Banco de Dados (Migração SQL)

| Alteração | Descrição |
|-----------|-----------|
| `ALTER TABLE proposal_items ADD COLUMN discount_type TEXT DEFAULT 'percentage'` | Tipo de desconto |
| `ALTER TABLE organizations ADD COLUMN default_shipping TEXT DEFAULT 'A combinar'` | Frete padrão |
| `ALTER TABLE proposals ADD COLUMN shipping TEXT` | Frete personalizado |

### Frontend

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useProposals.ts` | Adicionar `discount_type` no `ProposalItemFormData` e `shipping` nos dados da proposta |
| `src/pages/NewProposal.tsx` | UI para tipo de desconto + campo de frete |
| `src/pages/EditProposal.tsx` | UI para tipo de desconto + campo de frete |
| `src/pages/Settings.tsx` | Seção para configurar frete padrão da organização (apenas admin) |
| `src/contexts/AuthContext.tsx` | Buscar `default_shipping` da organização |

### Edge Function

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-pdf/index.ts` | Adicionar campo `{frete}` nos dados do template |

---

## Fluxo de Dados

### Frete

```text
1. Admin configura frete padrão em Configurações
   → Salva em organizations.default_shipping

2. Vendedor cria proposta
   → Se "Usar padrão" marcado: proposals.shipping = NULL
   → Se "Personalizado": proposals.shipping = valor digitado

3. PDF é gerado
   → Edge Function verifica: proposals.shipping ?? organizations.default_shipping
   → Envia para template como {frete}
```

### Desconto

```text
1. Vendedor adiciona item
   → discount_type = 'percentage' (padrão)

2. Vendedor pode alternar para R$
   → discount_type = 'fixed'

3. Cálculo do subtotal ajusta automaticamente
   → percentage: qty * price * (1 - discount/100)
   → fixed: (qty * price) - discount
```

---

## Detalhes Técnicos

### Migração do Banco

```sql
-- Tipo de desconto nos itens
ALTER TABLE proposal_items 
ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percentage' 
CHECK (discount_type IN ('percentage', 'fixed'));

-- Frete padrão na organização
ALTER TABLE organizations 
ADD COLUMN default_shipping TEXT DEFAULT 'A combinar';

-- Frete personalizado na proposta
ALTER TABLE proposals 
ADD COLUMN shipping TEXT;
```

### Interface ProposalItemFormData Atualizada

```typescript
interface ProposalItemFormData {
  item_id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  discount: number;
  discount_type: 'percentage' | 'fixed';  // NOVO
  subtotal: number;
  max_discount?: number;
}
```

### Lógica de Cálculo do Subtotal

```typescript
const calculateSubtotal = (
  quantity: number, 
  price: number, 
  discount: number, 
  discountType: 'percentage' | 'fixed'
) => {
  const baseValue = quantity * price;
  if (discountType === 'percentage') {
    return baseValue * (1 - discount / 100);
  }
  // fixed
  return Math.max(0, baseValue - discount);
};
```

### Edge Function - Novos Campos

```typescript
const templateData = {
  // ... campos existentes ...
  frete: proposal.shipping ?? organization?.default_shipping ?? 'A combinar',
};
```

---

## Status de Implementação

| # | Entrega | Status |
|---|---------|--------|
| 1 | Migração SQL para novas colunas | ✅ Concluído |
| 2 | Hook useProposals atualizado | ✅ Concluído |
| 3 | UI de desconto com toggle %/R$ | ✅ Concluído |
| 4 | UI de frete na proposta | ✅ Concluído |
| 5 | Configurações de frete padrão (admin) | ✅ Concluído |
| 6 | Edge Function com campo {frete} | ✅ Concluído |
| 7 | Hook useOrganizationSettings | ✅ Concluído |
| 8 | Componentes DiscountTypeToggle e ShippingField | ✅ Concluído |
