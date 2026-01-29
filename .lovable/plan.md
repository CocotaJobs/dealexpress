
# Roadmap para Produção do ProposalFlow

## Visão Geral

O ProposalFlow tem todo o **frontend construído com mocks**. Para colocar em produção, precisamos:
1. Conectar um backend real (Supabase via Lovable Cloud)
2. Implementar autenticação real
3. Integrar WhatsApp (Evolution API)
4. Implementar geração de PDF

---

## Fase 1: Backend e Banco de Dados
**Prioridade: CRÍTICA** | Estimativa: 2-3 sessões

### 1.1 Habilitar Lovable Cloud (Supabase)
- Ativar Lovable Cloud no projeto
- Configurar autenticação por email/senha

### 1.2 Criar Schema do Banco de Dados
Criar as seguintes tabelas com Row Level Security (RLS):

```text
┌─────────────────┐     ┌─────────────────┐
│  organizations  │────<│     users       │
└─────────────────┘     └────────┬────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  invitations  │     │    proposals      │     │    templates    │
└───────────────┘     └────────┬──────────┘     └─────────────────┘
                               │
        ┌──────────────────────┤
        │                      │
        ▼                      ▼
┌───────────────┐     ┌───────────────────┐
│     items     │────<│  proposal_items   │
└───────────────┘     └───────────────────┘
        │
        ▼
┌───────────────┐
│  categories   │
└───────────────┘
```

### 1.3 Configurar Storage Buckets
- `templates` - arquivos .docx dos templates
- `product-images` - imagens dos produtos
- `generated-pdfs` - PDFs gerados temporariamente

---

## Fase 2: Autenticação Real
**Prioridade: CRÍTICA** | Estimativa: 1-2 sessões

### 2.1 Substituir Mock por Supabase Auth
- Integrar Supabase Auth no AuthContext
- Implementar login/logout real
- Configurar listener de sessão

### 2.2 Sistema de Convites
- Criar Edge Function para envio de emails de convite
- Gerar tokens únicos com expiração
- Página de registro com validação de token

### 2.3 Perfis de Usuário
- Criar tabela `profiles` vinculada ao auth.users
- Implementar RLS baseado em role (admin/vendor)

---

## Fase 3: CRUD Real das Entidades
**Prioridade: ALTA** | Estimativa: 2-3 sessões

### 3.1 Itens (Produtos/Serviços)
- Conectar listagem, criação, edição ao Supabase
- Implementar upload de imagens
- Soft delete (marcar como inativo)

### 3.2 Categorias
- CRUD de categorias
- Vincular itens às categorias

### 3.3 Propostas
- Salvar propostas no banco
- Gerar número sequencial automático
- Status: draft, sent, expired
- Itens da proposta em tabela relacionada

### 3.4 Templates
- Upload de arquivos .docx para Storage
- Controle de template ativo

### 3.5 Usuários e Convites
- Listagem de usuários da organização
- Gerenciamento de convites pendentes

---

## Fase 4: Geração de PDF
**Prioridade: ALTA** | Estimativa: 1-2 sessões

### 4.1 Criar Edge Function para Geração
- Usar biblioteca como `docx-templates` ou `docx`
- Processar template Word com variáveis dinâmicas
- Converter DOCX para PDF (usando LibreOffice headless ou serviço externo)

### 4.2 Variáveis Dinâmicas
```text
{{cliente_nome}}, {{cliente_email}}, {{cliente_whatsapp}}
{{data}}, {{numero_proposta}}, {{vendedor_nome}}
{{tabela_itens}}, {{valor_total}}
{{condicoes_pagamento}}, {{validade_proposta}}
```

### 4.3 Preview e Download
- Endpoint para preview do PDF
- Salvamento temporário no Storage
- Download para o usuário

---

## Fase 5: Integração WhatsApp (Evolution API)
**Prioridade: ALTA** | Estimativa: 2-3 sessões

### 5.1 Configurar Evolution API
- Definir URL base da API (self-hosted ou serviço)
- Adicionar secrets: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`

### 5.2 Conexão via QR Code
- Edge Function para criar instância WhatsApp
- Endpoint para obter QR Code
- Webhook para status de conexão
- Armazenar session_id do usuário

### 5.3 Envio de Propostas
- Edge Function para enviar mensagem com PDF anexo
- Registrar data/hora de envio
- Atualizar status da proposta para "sent"

---

## Fase 6: Dashboards com Dados Reais
**Prioridade: MÉDIA** | Estimativa: 1-2 sessões

### 6.1 Queries Agregadas
- Total de propostas por período
- Valor total por vendedor/período
- Itens mais cotados
- Taxa de conversão (se aplicável)

### 6.2 Filtros Avançados
- Implementar filtros dinâmicos nas listagens
- Filtros por data, vendedor, status, valor

### 6.3 Exportação
- Exportar relatórios em CSV/Excel
- Edge Function para gerar arquivo

---

## Fase 7: Polimentos Finais
**Prioridade: MÉDIA** | Estimativa: 1-2 sessões

### 7.1 UX/UI
- Loading states em todas as operações
- Tratamento de erros amigável
- Confirmações em ações destrutivas
- Estados vazios bem desenhados

### 7.2 Validações
- Validação de formulários com Zod
- Validação de desconto máximo
- Validação de proposta expirada

### 7.3 Segurança
- Revisar todas as políticas RLS
- Testar isolamento entre organizações
- Verificar permissões admin vs vendor

---

## Resumo - Ordem de Execução

| # | Fase | Descrição | Prioridade |
|---|------|-----------|------------|
| 1 | Backend | Habilitar Lovable Cloud + Schema | CRÍTICA |
| 2 | Auth | Autenticação real + Convites | CRÍTICA |
| 3 | CRUD | Entidades conectadas ao banco | ALTA |
| 4 | PDF | Geração de propostas em PDF | ALTA |
| 5 | WhatsApp | Integração Evolution API | ALTA |
| 6 | Dashboards | Dados reais e relatórios | MÉDIA |
| 7 | Polish | Validações, UX, segurança | MÉDIA |

---

## Próximo Passo Recomendado

**Começar pela Fase 1:** Habilitar Lovable Cloud e criar o schema do banco de dados. Isso é a fundação para todo o resto.

Quer que eu comece habilitando o Lovable Cloud e criando as tabelas do banco de dados?
