# Inteligência de negócios: situação atual, melhorias e Kommo

## O que existe hoje (painel inicial)
- Cartões: total de propostas, valor total, ticket médio (admin) ou enviadas, usuários ativos (admin) ou rascunhos.
- Gráficos: propostas por período, status das propostas, propostas por vendedor (admin), valor por período e itens mais cotados.
- Limitação principal: a proposta só tem os status Rascunho, Enviada e Expirada. Não registramos se a venda foi **ganha ou perdida**, então não dá para medir conversão nem receita real.

## Melhorias propostas (em ordem de impacto)
1. **Resultado da venda**: novos status "Ganha" e "Perdida" (com motivo da perda: preço, prazo, concorrente, outro). Vendedor marca na lista ou na página da proposta.
2. **Novos indicadores**: taxa de conversão (ganhas / enviadas), receita fechada, tempo médio até o fechamento, propostas vencendo nos próximos 7 dias e ranking de vendedores por valor fechado.
3. **Filtros no painel**: período (7, 30, 90 dias ou personalizado) e vendedor, aplicados a todos os gráficos.
4. **Funil de vendas**: Rascunho → Enviada → Ganha/Perdida, com valor em cada etapa.
5. **Exportar relatório** em Excel com as propostas filtradas.
6. **Desempenho**: o painel e a lista de propostas hoje fazem uma consulta por proposta. Agrupar isso em uma única consulta deixa as telas bem mais rápidas conforme o volume cresce.

## Integração com o Kommo
- Sim, é possível. O Kommo tem API aberta; conectamos com uma chave de acesso de longa duração gerada na conta Kommo (uma integração privada).
- O que faria:
  - Ao **enviar** uma proposta, cria ou atualiza o contato/empresa e um negócio (lead) no Kommo com o valor da proposta e link do PDF.
  - Quando a proposta for marcada como **Ganha/Perdida**, move o negócio para a etapa correspondente do funil no Kommo.
  - Configuração em Ajustes: escolher o funil e as etapas do Kommo usadas.
- Depende do item 1 (status Ganha/Perdida) para o retorno completo.
- Você precisará fornecer: o endereço da sua conta Kommo (ex.: suaempresa.kommo.com) e a chave de acesso.

## Ordem sugerida
Fase 1: itens 1, 2, 3 e 6. Fase 2: itens 4 e 5. Fase 3: Kommo.

## Detalhes técnicos
- Enum `proposal_status` ganha `won` e `lost`; colunas `closed_at timestamptz` e `lost_reason text` (aditivas).
- Métricas agregadas em uma função SQL `security invoker` respeitando as regras de acesso atuais (vendedor vê só as próprias).
- Kommo via conector personalizado (API REST v4, token de longa duração), chamado por uma função de backend; erros genéricos para a interface, detalhes no log.
- Sem recursos de IA (excluídos do projeto).
