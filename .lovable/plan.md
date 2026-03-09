

## Propostas por Vendedor - Gráfico no Dashboard

Adicionar um gráfico de barras horizontais mostrando a quantidade de propostas criadas por cada vendedor, visível apenas para admins.

---

### Alterações

#### 1. `src/hooks/useDashboardMetrics.ts`

- Adicionar `created_by` ao select de proposals: `'id, status, created_at, created_by'`
- Buscar nomes dos usuários de `profiles_safe` (já é feito, variável `users`)
- Calcular novo campo `proposalsByVendor`: agrupar proposals por `created_by`, cruzar com profiles para pegar o nome, ordenar por quantidade decrescente, retornar top 10
- Adicionar ao tipo `DashboardMetrics`:
  ```
  proposalsByVendor: { name: string; count: number; value: number }[]
  ```

#### 2. `src/pages/Dashboard.tsx`

- Adicionar novo gráfico de barras horizontais na seção "Second Charts Row", transformando o grid de 2 colunas em 3 (ou adicionando uma nova row)
- O gráfico mostra barras horizontais com nome do vendedor no eixo Y e quantidade de propostas no eixo X
- Tooltip mostra também o valor total das propostas do vendedor
- Visível apenas para admins (`isAdmin`)
- Segue o mesmo padrão visual dos outros gráficos (cores, tooltips, animações)

### Dados calculados

Para cada vendedor:
- **name**: nome do perfil (de `profiles_safe`)
- **count**: quantidade de propostas criadas
- **value**: valor total das propostas (soma dos itens)

