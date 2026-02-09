

## Correcao Definitiva: Onboarding do Sergio e Robustez do Trigger

### Problema

O Sergio se registrou com o token de convite correto (presente no metadata), mas o trigger `handle_new_user` nao vinculou ele a organizacao correta. O mesmo problema que ocorreu com o Eduardo.

Dados atuais do Sergio:
- Organizacao: "Sergio Felipe's Organization" (errada, orfan - `cbc76f4a`)
- Cargo: admin (deveria ser admin na org do Joao Vitor)
- Convite: ainda "pending" (nunca foi aceito)
- Org correta: `9940b4bb` (Joao Vitor Felipe's Organization)

### Causa raiz

Apos analise exaustiva (token correto no metadata, convite valido, migration aplicada, trigger habilitado, postgres com bypassrls), a causa mais provavel eh que as verificacoes `RECORD IS NULL` e `RECORD IS NOT NULL` no PL/pgSQL nao funcionam de forma confiavel para variaveis do tipo `RECORD` apos `SELECT INTO` sem resultados. O comportamento padrao do PostgreSQL eh:
- Se nenhuma linha eh retornada, os campos do RECORD sao setados para NULL
- `record IS NULL` retorna TRUE somente se TODOS os campos sao NULL
- Mas o comportamento pode variar dependendo da versao e contexto de execucao

A variavel especial `FOUND` (automaticamente setada pelo PL/pgSQL apos cada SELECT/INSERT/UPDATE/DELETE) eh a forma confiavel e recomendada pela documentacao do PostgreSQL para verificar se um SELECT INTO retornou resultados.

### Solucao em 2 partes

---

### Parte 1: Corrigir dados do Sergio (SQL direto)

- Mover perfil do Sergio para `9940b4bb` (Joao Vitor Felipe's Organization)
- Manter cargo `admin` (conforme o convite)
- Marcar convite `6b3f2ade` como `accepted`
- Deletar organizacao orfan `cbc76f4a`

---

### Parte 2: Reescrever verificacoes do trigger usando FOUND

Substituir TODAS as verificacoes `invitation_record IS NULL` e `invitation_record IS NOT NULL` pela variavel `FOUND`, que eh a forma padrao e confiavel do PL/pgSQL:

```text
Antes (nao confiavel):
  SELECT i.* INTO invitation_record FROM invitations ...;
  IF invitation_record IS NULL THEN ...

Depois (confiavel):
  SELECT i.* INTO invitation_record FROM invitations ...;
  IF NOT FOUND THEN ...
```

Mudancas especificas no trigger `handle_new_user`:
1. Verificacao de perfil duplicado: trocar `IF existing_profile_id IS NOT NULL` por usar FOUND
2. Lookup por token: trocar `IF invitation_record IS NULL` por `IF NOT FOUND`
3. Decisao final (criar em org do convite vs nova org): usar variavel booleana `invitation_found` setada via FOUND

Nenhuma mudanca na logica de negocio - apenas nas verificacoes de resultado de queries.

---

### Impacto

- Corrige os dados do Sergio imediatamente
- Torna o trigger robusto contra o bug de RECORD IS NULL
- Nenhuma mudanca em RLS, autenticacao ou codigo frontend
- Nenhuma funcionalidade comprometida

### Verificacao pos-correcao

1. Confirmar que Sergio esta na organizacao correta com cargo admin
2. Confirmar que convite esta marcado como accepted
3. Confirmar que organizacao orfan foi deletada
4. Executar scan de seguranca
