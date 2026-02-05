

## Correção Definitiva: Convites e Onboarding

### Problema diagnosticado

O Eduardo se registrou **sem usar o link de convite** (acessou `/register` diretamente sem os parametros `?token=...&email=...`). O trigger `handle_new_user` depende exclusivamente do token no metadata do signup. Sem o token, o trigger tratou o registro como "novo usuario independente", criando uma organizacao separada e dando cargo de admin.

Dados atuais do Eduardo:
- Organizacao: "Eduardo Linzmeyer's Organization" (errada, orphan)
- Cargo: admin (errado, deveria ser vendor)
- Convite: ainda "pending" (nunca foi aceito)

### Solucao em duas partes

---

### Parte 1: Corrigir os dados do Eduardo (migracao SQL)

1. Mover o perfil do Eduardo para a organizacao correta (`9940b4bb` - Joao Vitor Felipe's Organization)
2. Trocar o cargo dele de `admin` para `vendor`
3. Marcar o convite como `accepted`
4. Deletar a organizacao orfan (`ffbf3ed5` - Eduardo Linzmeyer's Organization)

---

### Parte 2: Tornar o trigger a prova de falhas (correcao definitiva)

Atualizar `handle_new_user` para adicionar um **fallback por email**: se nenhum token foi passado no metadata, o trigger verifica se existe um convite pendente para o email que esta sendo registrado. Se encontrar, usa a organizacao e o cargo do convite em vez de criar uma nova organizacao.

Logica atualizada do trigger:

```text
1. Tenta extrair invitation_token do metadata
2. SE token existe:
   - Busca convite pelo token (como ja faz hoje)
   - Valida email match
3. SE token NAO existe:
   - [NOVO] Busca convite pendente pelo email (NEW.email)
   - Se encontrar, usa esse convite
4. SE convite encontrado (por token OU por email):
   - Vincula usuario a organizacao do convite
   - Atribui o cargo do convite
   - Marca convite como aceito
5. SE nenhum convite encontrado:
   - Cria nova organizacao (comportamento atual)
   - Atribui cargo admin
```

Essa abordagem eh segura porque:
- O email eh verificado pelo sistema de autenticacao (confirmacao por email)
- O convite foi criado explicitamente para aquele email pelo admin
- O token continua sendo o metodo primario; o email eh apenas fallback
- Se houver multiplos convites pendentes para o mesmo email (raro), usa o mais recente

---

### Parte 3: Prevenir registros duplicados (protecao extra)

Adicionar ao trigger uma verificacao: se ja existe um perfil com o email sendo registrado, nao criar um novo. Isso previne duplicatas em cenarios edge-case.

---

### Arquivos afetados

1. **Nova migracao SQL** - Corrige os dados do Eduardo + atualiza o trigger `handle_new_user`
2. **Nenhum arquivo de codigo frontend muda** - O frontend ja passa o token corretamente quando disponivel; o problema era no backend (trigger)

---

### Seguranca

- Nenhuma mudanca em RLS policies
- O trigger continua como `SECURITY DEFINER` com `SET LOCAL row_security TO off`
- A busca por email como fallback nao introduz vulnerabilidades pois o email eh verificado pelo Supabase Auth
- O comportamento existente (token primario) nao eh alterado
- Scan de seguranca sera executado apos as mudancas

### Testes apos implementacao

1. Verificar que Eduardo agora aparece como `vendor` na organizacao de Joao Vitor Felipe
2. Verificar que o convite de Eduardo esta marcado como `accepted`
3. Verificar que a organizacao orfan foi deletada
4. Testar um novo registro SEM usar o link de convite (registrar com email que tem convite pendente) - deve vincular corretamente
5. Testar um novo registro COM o link de convite - deve continuar funcionando
6. Testar um registro sem convite algum - deve criar nova organizacao normalmente
7. Executar scan de seguranca

