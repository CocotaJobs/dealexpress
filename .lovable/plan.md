# Campos obrigatórios e treinamento técnico na proposta

## O que muda para o vendedor
- Ao criar ou editar uma proposta, estes campos passam a ser obrigatórios: **Nome da empresa**, **CPF ou CNPJ** (documento completo: 11 ou 14 dígitos), **Nome do cliente/contato** e **Telefone/WhatsApp** (10 ou 11 dígitos).
- Os campos ficam marcados com asterisco (*); se faltar algo, aparece uma mensagem dizendo exatamente qual campo preencher. Vale para salvar rascunho, visualizar PDF e enviar.
- Novo campo **Treinamento técnico** com escolha **Sim / Não** (padrão: Não), na criação e na edição.
- O PDF passa a mostrar o valor escolhido pela nova variável `{treinamento}` no modelo Word (exibe "Sim" ou "Não"). Será preciso trocar o texto fixo do modelo por `{treinamento}`.
- Ao duplicar uma proposta, os dados do cliente e o treinamento são copiados.

## Detalhes técnicos
- Banco: nova coluna `proposals.technical_training boolean not null default false` (aditiva, sem impacto nas propostas existentes). Regerar tipos.
- `NewProposal.tsx` e `EditProposal.tsx`: estado `technicalTraining`, toggle Sim/Não, `validateForm` ampliado; incluir o campo nos 3 payloads (rascunho, preview, envio).
- `useProposals.duplicateProposal`: copiar `client_cnpj`, `shipping` e `technical_training`.
- `generate-pdf`: adicionar `treinamento` ao conjunto de variáveis e redeploy.
- Teste vitest para a validação de obrigatórios (extraída para função pura).
- Executar varredura de segurança ao final.
