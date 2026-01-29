# Roadmap ProposalFlow

## ✅ Fases Concluídas

### Fase 1 - Backend e Banco de Dados
- Supabase configurado com tabelas: organizations, profiles, items, categories, proposals, proposal_items, templates
- RLS policies implementadas
- Triggers para timestamps e geração de número de proposta

### Fase 2 - Autenticação
- Login/registro com Supabase Auth
- Contexto de autenticação (AuthContext)
- Proteção de rotas
- Perfis de usuário com roles (admin/vendor)

### Fase 3 - Integração WhatsApp
- Conexão com Evolution API via Edge Function
- Geração de QR Code dinâmico
- Polling para detecção de conexão
- Atualização automática do status no banco

### Fase 4 - CRUD Completo
- Itens: listagem, criação, edição, ativação/desativação
- Categorias: criação inline, listagem
- Propostas: listagem, criação, duplicação, exclusão
- Templates: upload, ativação, download, histórico

### Fase 5 - Geração de PDF ✅
- Edge Function `generate-pdf` criada
- Geração de PDF a partir de template HTML
- Armazenamento no bucket `generated-pdfs`
- Botão de pré-visualização funcionando
- Integração com envio via WhatsApp

### Fase 6 - Envio via WhatsApp ✅
- PDF gerado e armazenado automaticamente
- Envio via Evolution API com PDF anexado
- Atualização de status para "sent"
- Mensagem personalizada com nome do cliente

## 🚧 Próximos Passos

### Fase 7 - Dashboard com Métricas
**Objetivo:** Mostrar estatísticas e resumos

- Total de propostas por status
- Valor total em propostas
- Gráficos de evolução
- Propostas recentes

### Fase 8 - Melhorias
- Visualização de proposta (página dedicada)
- Edição de proposta existente
- Gerenciamento de categorias dedicado
- Relatórios exportáveis
- Templates Word (.docx) com docxtemplater
