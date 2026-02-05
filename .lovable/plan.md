
# Plano: Correção do Erro "Erro ao Gerar Proposta"

## Problema Identificado

O erro está sendo causado por **overflow numérico** no campo `discount` da tabela `proposal_items`. Este campo tem precisão `numeric(5,2)`, que aceita valores até 999.99. Quando o usuário aplica um desconto em valor fixo (R$) maior que R$ 999,99, o banco de dados rejeita a inserção.

**Logs do erro:**
- `numeric field overflow` - Confirmado nos logs do PostgreSQL
- O erro ocorre ao tentar criar proposta com itens que tenham desconto fixo acima do limite

## Solução Proposta

### 1. Migração de Banco de Dados

Alterar a precisão do campo `discount` na tabela `proposal_items` de `numeric(5,2)` para `numeric(12,2)`:

```sql
ALTER TABLE public.proposal_items 
ALTER COLUMN discount TYPE numeric(12,2);
```

Isso permitirá descontos em valor fixo de até R$ 9.999.999.999,99, que é mais que suficiente para qualquer caso de uso.

### 2. Verificação de Segurança

Após a migração, será executado um security scan para garantir que nenhuma funcionalidade foi comprometida.

## Resumo das Mudanças

| Arquivo/Componente | Alteração |
|-------------------|-----------|
| Tabela `proposal_items` | Campo `discount`: `numeric(5,2)` para `numeric(12,2)` |

## Impacto

- **Funcionalidades existentes**: Nenhum impacto negativo
- **Dados existentes**: Preservados (apenas aumenta a capacidade)
- **Performance**: Nenhum impacto significativo

## Passos de Implementação

1. Aplicar migração SQL para alterar precisão do campo
2. Executar security scan
3. Testar criação de proposta com desconto fixo alto
