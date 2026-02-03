
# Plano de Animações para o Dashboard

## Resumo das Animações a Implementar

Com base na sua seleção, vou adicionar as seguintes animações ao dashboard:

1. **Animações Staggered nos Cards** - Efeito cascata onde cada card aparece com um pequeno atraso
2. **Animação de Contagem nos Números** - Valores contam de 0 até o valor final
3. **Animações de Entrada nos Gráficos** - Linhas desenhando e barras crescendo
4. **Pulso Sutil no Botão "Nova Proposta"** (bem discreto, como solicitado)
5. **Efeito de Animação no PieChart** - Crescimento do centro para fora
6. **Efeitos de Hover Sutis** - Pequenos brilhos dourados e transições suaves

---

## Detalhes Técnicos da Implementação

### 1. Hook Personalizado para Contagem de Números
Criar um hook `useCountUp` que anima valores de 0 até o número final com easing suave.

```text
src/hooks/useCountUp.ts (novo arquivo)
├── Parâmetros: valor final, duração, delay opcional
├── Retorna: valor animado atual
└── Usa requestAnimationFrame para performance
```

### 2. Componentes Animados

**StatCard com Stagger:**
- Adicionar prop `animationDelay` ao StatCard
- Cada card recebe um delay incremental (0ms, 100ms, 200ms, 300ms)
- Usar CSS custom property para controlar o delay

**Números Animados:**
- Integrar `useCountUp` nos valores de Total de Propostas, Valor Total, etc.
- Formatar números durante a animação (moeda, porcentagem)

### 3. Animações de Gráficos (Recharts)

```text
LineChart:
├── isAnimationActive={true}
├── animationDuration={1500}
├── animationEasing="ease-out"
└── animationBegin={300} (delay para sincronizar com cards)

BarChart:
├── isAnimationActive={true}
├── animationDuration={1200}
└── animationEasing="ease-out"

PieChart:
├── isAnimationActive={true}
├── animationDuration={1000}
├── animationBegin={400}
└── startAngle={90}, endAngle={-270} (efeito de preenchimento circular)
```

### 4. Pulso Sutil no Botão "Nova Proposta"
- Adicionar classe `animate-pulse-subtle` com opacidade mínima (90%-100%)
- Efeito quase imperceptível que chama atenção sem distrair

### 5. CSS Keyframes Adicionais

```text
index.css:
├── @keyframes stagger-in (para entrada escalonada)
├── @keyframes count-pulse (pulso sutil durante contagem)
├── @keyframes pulse-subtle (para botão Nova Proposta)
└── @keyframes glow-pulse (brilho dourado sutil no hover)
```

### 6. Estrutura de Delays

```text
Sequência de Animação:
├── 0ms: Header aparece
├── 0-300ms: Stats cards (staggered, 75ms entre cada)
├── 300ms: Gráficos começam a animar
├── 400ms: PieChart começa
└── 500ms: Status Summary Cards (bottom)
```

---

## Arquivos a Serem Modificados

| Arquivo | Alterações |
|---------|------------|
| `src/hooks/useCountUp.ts` | Novo hook para animação de números |
| `src/pages/Dashboard.tsx` | Integrar animações em cards, gráficos e números |
| `src/index.css` | Adicionar keyframes e classes de animação |

---

## Observações de UX

- Todas as animações respeitam `prefers-reduced-motion` do sistema
- Animações são executadas apenas na primeira renderização (não em re-renders)
- Durações curtas (200-1500ms) para não atrapalhar a experiência
- O pulso no botão "Nova Proposta" será muito sutil (opacity 95%-100%)
- Efeitos de hover incrementais, não intrusivos
