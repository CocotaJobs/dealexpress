
# Plano: Correção da Check Constraint de Desconto

## Problema Identificado

O erro está sendo causado por uma **check constraint** (`proposal_items_discount_check`) que limita o campo `discount` a valores entre 0 e 100. Esta constraint foi criada quando apenas descontos percentuais eram suportados.

**Logs do erro:**
```
new row for relation "proposal_items" violates check constraint "proposal_items_discount_check"
```

**Constraint atual:**
```sql
CHECK ((discount >= 0) AND (discount <= 100))
```

## Solução Proposta

Substituir a constraint para validar corretamente com base no tipo de desconto:
- **Desconto percentual (%)**: Manter limite 0-100
- **Desconto fixo (R$)**: Apenas validar que seja >= 0 (sem limite superior)

### Migração SQL

```sql
-- Remover a constraint antiga
ALTER TABLE public.proposal_items 
DROP CONSTRAINT proposal_items_discount_check;

-- Adicionar nova constraint que considera o tipo de desconto
ALTER TABLE public.proposal_items 
ADD CONSTRAINT proposal_items_discount_check 
CHECK (
  (discount >= 0) AND 
  (discount_type = 'percentage' AND discount <= 100 OR discount_type = 'fixed')
);
```

## Resumo das Mudanças

| Componente | Alteração |
|------------|-----------|
| Constraint `proposal_items_discount_check` | Atualizada para permitir descontos fixos > 100 |

## Impacto

- **Funcionalidades existentes**: Nenhum impacto negativo
- **Dados existentes**: Preservados
- **Segurança**: Mantida (validação de percentual 0-100 continua ativa)

## Passos de Implementação

1. Aplicar migração SQL para atualizar a constraint
2. Testar criação de proposta com desconto fixo e percentual
3. Executar security scan para garantir integridade
