
# Plano: Cards Clicaveis no Dashboard

## Resumo
Tornar os cards relacionados a propostas no dashboard interativos, permitindo que o usuario clique neles para navegar diretamente para a lista de propostas com filtros apropriados pre-aplicados.

---

## Comportamento Esperado

### Cards que serao clicaveis

| Card | Navegacao |
|------|-----------|
| Total de Propostas | `/proposals` (todas) |
| Valor Total | `/proposals` (todas) |
| Propostas Enviadas | `/proposals?status=sent` |
| Rascunhos | `/proposals?status=draft` |
| Grafico de Pizza (Rascunho) | `/proposals?status=draft` |
| Grafico de Pizza (Enviadas) | `/proposals?status=sent` |
| Grafico de Pizza (Expiradas) | `/proposals?status=expired` |

### Feedback Visual
- Cursor pointer ao passar sobre o card
- Efeito de hover sutil (elevacao/brilho)
- Indicador visual de que e clicavel (icone de seta ou transicao)

---

## Etapas de Implementacao

### Etapa 1: Atualizar StatCard para Suportar Navegacao
Modificar o componente `StatCard` para aceitar uma prop opcional `href` que transforma o card em um link navegavel.

**Mudancas:**
- Adicionar prop `href?: string` ao interface
- Envolver o card com `Link` quando href estiver presente
- Adicionar estilos de hover interativo

### Etapa 2: Aplicar Links nos Cards de Propostas
Passar a prop `href` para os cards relevantes no Dashboard:

```text
StatCard "Total de Propostas" -> href="/proposals"
StatCard "Valor Total" -> href="/proposals"
StatCard "Propostas Enviadas" (vendedor) -> href="/proposals?status=sent"
StatCard "Rascunhos" (vendedor) -> href="/proposals?status=draft"
```

### Etapa 3: Tornar Grafico de Pizza Interativo
Adicionar eventos de clique nas fatias do grafico PieChart para navegar por status:

- Fatia "Rascunho" -> `/proposals?status=draft`
- Fatia "Enviadas" -> `/proposals?status=sent`
- Fatia "Expiradas" -> `/proposals?status=expired`

### Etapa 4: Atualizar Pagina de Propostas para Ler Query Params
Modificar a pagina Proposals.tsx para:
- Ler o parametro `status` da URL
- Pre-preencher o filtro de status com base no parametro
- Sincronizar o filtro com a URL

---

## Detalhes Tecnicos

### Componente StatCard Atualizado
```text
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  isLoading?: boolean;
  href?: string;  // Nova prop para navegacao
}
```

### Estrutura do Link
```text
- Se href existe: envolver com <Link to={href}>
- Adicionar classes: cursor-pointer, hover-lift, group
- Manter comportamento de loading sem link
```

### Grafico de Pizza Interativo
```text
- Usar onClick no componente <Cell>
- useNavigate() para navegacao programatica
- Adicionar cursor: pointer nas fatias
- Feedback visual de hover nas fatias
```

### Leitura de Query Params em Proposals
```text
- useSearchParams() do react-router-dom
- Inicializar statusFilter com searchParams.get('status')
- Atualizar URL quando filtro mudar (opcional)
```

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard.tsx` | Adicionar props href aos StatCards, tornar pie chart clicavel |
| `src/pages/Proposals.tsx` | Ler query param de status da URL |

---

## Resultado Final
- Cards do dashboard serao visivelmente interativos
- Clicar em um card de proposta levara o usuario diretamente para a lista filtrada
- Experiencia mais fluida de navegacao entre metricas e dados detalhados
- Grafico de pizza permitira explorar propostas por status
