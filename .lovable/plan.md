
# Plano de Correção de Dados do Usuário André Rocha

## Problema Identificado

O usuário **André Rocha** (andre.p@jvfmaquinas.com.br) foi registrado incorretamente:

| Campo | Valor Atual (Errado) | Valor Correto |
|-------|---------------------|---------------|
| Organização | `André Rocha's Organization` | `João Vitor Felipe's Organization` |
| Role | `admin` | `vendor` |
| ID Org | `7d3d5e71-ef49-...` | `9940b4bb-3ffb-...` |

## Causa Raiz

O token de convite **não foi passado corretamente** durante o registro. Isso pode ter acontecido porque:
1. O usuário acessou a página de registro diretamente (sem usar o link do convite)
2. Os parâmetros da URL foram perdidos durante a navegação

## Solução: Migração SQL

Vou criar uma migração SQL que:

1. **Move o usuário André para a organização correta** (JVF Máquinas)
2. **Altera o role de admin para vendor**
3. **Marca o convite como aceito**
4. **Exclui a organização órfã** que foi criada automaticamente

```text
ANTES:
┌─────────────────────┐     ┌─────────────────────────────┐
│ André Rocha's Org   │     │ João Vitor Felipe's Org     │
│ (órfã, 0 items)     │     │ (8 templates, 2 items)      │
├─────────────────────┤     ├─────────────────────────────┤
│ - André (admin) ✗   │     │ - João Vitor Felipe (admin) │
└─────────────────────┘     │ - João Vitor (vendor) ✓     │
                            └─────────────────────────────┘

DEPOIS:
┌─────────────────────────────┐
│ João Vitor Felipe's Org     │
│ (8 templates, 2 items)      │
├─────────────────────────────┤
│ - João Vitor Felipe (admin) │
│ - João Vitor (vendor)       │
│ - André Rocha (vendor) ✓    │
└─────────────────────────────┘
```

## Arquivos a Modificar

1. **Nova migração SQL** - Corrigir os dados do usuário André

## SQL a Executar

```sql
-- Corrigir o usuário André Rocha
-- 1. Mover para a organização correta
UPDATE profiles
SET organization_id = '9940b4bb-3ffb-424f-9e92-149ec008d423'
WHERE id = 'b2a8074a-0b9f-459b-aef7-9d25a0ad1013';

-- 2. Alterar role de admin para vendor
UPDATE user_roles
SET role = 'vendor'
WHERE user_id = 'b2a8074a-0b9f-459b-aef7-9d25a0ad1013';

-- 3. Marcar o convite como aceito
UPDATE invitations
SET status = 'accepted', accepted_at = NOW()
WHERE email = 'andre.p@jvfmaquinas.com.br'
  AND organization_id = '9940b4bb-3ffb-424f-9e92-149ec008d423';

-- 4. Excluir a organização órfã
DELETE FROM organizations
WHERE id = '7d3d5e71-ef49-4fc0-8eaa-2aaa51e62fa9';
```

## Resultado Esperado

Após a migração:
- André Rocha aparecerá na lista de usuários da organização JVF Máquinas
- André terá acesso aos 8 templates e 2 itens existentes
- O role de André será `vendor` (vendedor)
- A organização órfã será removida
- O convite original será marcado como aceito
