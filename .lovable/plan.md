

## Unificar cores dos gráficos para o amarelo dourado (primary)

Atualmente os gráficos usam cores diferentes:
- **Propostas por Período** (LineChart): `hsl(var(--primary))` — amarelo dourado ✓
- **Faturamento por Período** (BarChart): `hsl(var(--primary))` ✓
- **Itens Mais Cotados** (BarChart): `hsl(var(--chart-2))` — tom diferente
- **Propostas por Vendedor** (BarChart): `hsl(var(--chart-3))` — tom diferente
- **PieChart de status**: usa cores semânticas (muted, primary, destructive) — manter assim pois representam estados diferentes

### Alteração

**Arquivo**: `src/pages/Dashboard.tsx`

1. **Itens Mais Cotados** (linha 590): trocar `fill="hsl(var(--chart-2))"` para `fill="hsl(var(--primary))"`
2. **Propostas por Vendedor** (linha 472): trocar `fill="hsl(var(--chart-3))"` para `fill="hsl(var(--primary))"`
3. **Constante COLORS** (linha 164): atualizar para usar apenas `hsl(var(--primary))` — embora só seja usada como referência, manter consistente

O PieChart de distribuição por status mantém as cores semânticas (cinza para rascunho, amarelo para enviadas, vermelho para expiradas) pois representam categorias distintas.

