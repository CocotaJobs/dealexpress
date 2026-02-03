

## Plano: Correção do Fluxo de Convites

### Problema Identificado

O trigger `handle_new_user` não está encontrando o convite pendente durante o registro. O diagnóstico revelou:

1. **Causa raiz**: O trigger executa como `SECURITY DEFINER`, mas ainda está sujeito às políticas RLS da tabela `invitations`
2. **Efeito**: A query `SELECT * FROM invitations WHERE email = ...` retorna vazio porque `auth.uid()` ainda não existe no contexto do trigger
3. **Resultado**: O trigger cria uma nova organização e define o usuário como admin, ignorando o convite

### Evidências

| Dado | Valor |
|------|-------|
| Convite criado | 11:45:22 - organização `9940b4bb...` |
| Usuário registrado | 11:49:14 |
| Resultado | Nova organização `33240eac...` criada |
| Convite | Permanece como `pending` |
| Usuário | Definido como `admin` em vez de `vendor` |

### Solução

Atualizar o trigger `handle_new_user` para bypassar RLS ao buscar o convite.

---

### Alterações Necessárias

#### 1. Migração SQL - Atualizar o Trigger

Criar uma versão corrigida do trigger que usa uma query que bypassa RLS:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  user_name TEXT;
  new_org_id UUID;
BEGIN
  -- Buscar convite pendente (usando tabela diretamente, já que SECURITY DEFINER deve bypassar RLS)
  -- Adicionando SET LOCAL para garantir bypass
  EXECUTE 'SET LOCAL row_security TO off';
  
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Restaurar row security
  EXECUTE 'SET LOCAL row_security TO on';

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  IF invitation_record IS NOT NULL THEN
    -- Usuário convidado: vincular à organização do convite
    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, invitation_record.organization_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);

    -- Marcar convite como aceito
    UPDATE public.invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
  ELSE
    -- Novo usuário sem convite: criar organização própria
    INSERT INTO public.organizations (name)
    VALUES (user_name || '''s Organization')
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, organization_id, name, email)
    VALUES (NEW.id, new_org_id, user_name, NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;
```

#### 2. Correção de Dados Existentes

Corrigir manualmente o usuário `joao@jvfmaquinas.com.br`:

```sql
-- 1. Atualizar o profile para a organização correta
UPDATE profiles 
SET organization_id = '9940b4bb-3ffb-424f-9e92-149ec008d423'
WHERE email = 'joao@jvfmaquinas.com.br';

-- 2. Atualizar o role para vendor (conforme convite)
UPDATE user_roles 
SET role = 'vendor'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'joao@jvfmaquinas.com.br');

-- 3. Marcar o convite como aceito
UPDATE invitations 
SET status = 'accepted', accepted_at = NOW()
WHERE email = 'joao@jvfmaquinas.com.br' AND status = 'pending';

-- 4. Remover a organização órfã criada erroneamente
DELETE FROM organizations 
WHERE id = '33240eac-b5ec-4eb5-910d-ccc224773cdd';
```

---

### Resumo das Correções

| Item | Antes | Depois |
|------|-------|--------|
| Trigger `handle_new_user` | Falha ao encontrar convite | Bypassa RLS corretamente |
| Usuário joao@jvfmaquinas.com.br | org errada + admin | org correta + vendor |
| Convite | pending | accepted |
| Organização órfã | existente | removida |

---

### Arquivos a Modificar

| Tipo | Descrição |
|------|-----------|
| Migração SQL | Atualizar função `handle_new_user` para bypassar RLS |
| Migração SQL | Corrigir dados do usuário afetado |

---

### Resultado Esperado

1. Novos usuários convidados serão vinculados à organização correta
2. Receberão o role definido no convite (admin ou vendor)
3. O convite será marcado como `accepted` automaticamente
4. Admin verá o novo membro na lista de usuários
5. Novo membro verá os dados da organização correta

