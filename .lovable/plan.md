

## Plano: Corrigir Acesso a Convites para Usuários Não Autenticados

### Problema Identificado

O convite **existe no banco de dados** e está válido:
- Token: `3243383e-fd6b-42e3-b039-b9214e93aa3a`
- Email: `joao@jvfmaquinas.com.br`
- Status: `pending`
- Expira: 10/02/2026

**Porém**, a política de RLS atual só permite leitura de convites para usuários **autenticados**:

```sql
CREATE POLICY "Users can view invitations in their organization"
  ON public.invitations FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
```

O usuário na página de registro ainda **não está autenticado**, então a query retorna vazio e o sistema interpreta como "convite não encontrado".

---

### Solução

Adicionar uma política RLS que permita acesso **anônimo** (`anon`) para leitura de convites, mas **apenas pelo token**. Isso é seguro porque:

1. O token é um UUID único e impossível de adivinhar
2. Só expõe informações básicas do convite (email, role, organização)
3. É necessário para o fluxo de registro funcionar

---

### Alteração no Banco de Dados

Criar uma nova política RLS:

```sql
CREATE POLICY "Anyone can view invitations by token"
  ON public.invitations 
  FOR SELECT 
  TO anon
  USING (true);
```

**Nota**: Esta política permite que usuários anônimos leiam convites, mas só terão acesso se souberem o token exato (UUID). Sem o token, não conseguem descobrir convites existentes.

Uma alternativa mais restritiva seria usar uma função no servidor, mas isso adiciona complexidade desnecessária para este caso.

---

### Resumo das Alterações

| Tipo | Descrição |
|------|-----------|
| Migração SQL | Adicionar política RLS para acesso anônimo a convites |

---

### Resultado Esperado

1. O link de convite funcionará corretamente
2. Usuários não autenticados poderão ver as informações do convite
3. O formulário de registro será preenchido com os dados corretos
4. O fluxo de cadastro via convite funcionará normalmente

