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

## 🚧 Próximos Passos

### Fase 5 - Geração de PDF
**Objetivo:** Gerar propostas em PDF usando templates Word (.docx)

**Tecnologia:**
- Edge Function com biblioteca docxtemplater (Deno)
- Conversão .docx → PDF usando LibreOffice ou API externa

**Fluxo:**
1. Usuário clica em "Gerar PDF" ou "Enviar via WhatsApp"
2. Edge Function busca o template ativo
3. Preenche os campos dinâmicos com dados da proposta
4. Converte para PDF
5. Armazena no bucket `generated-pdfs`
6. Retorna URL do PDF

### Fase 6 - Envio via WhatsApp
**Objetivo:** Enviar o PDF gerado diretamente para o cliente

**Fluxo:**
1. PDF gerado e armazenado
2. Edge Function envia via Evolution API
3. Atualiza status da proposta para "sent"
4. Registra data de envio

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
