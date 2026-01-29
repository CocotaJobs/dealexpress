
# Plano: Data por Extenso e Limpeza de Dados Mock

## Resumo

Este plano implementa duas mudanças:
1. **Campo de data por extenso dinâmica** - Adicionar um campo `{{data_extenso}}` nos templates de proposta que exibe a data atual no formato "29 de Janeiro de 2026"
2. **Limpeza de dados mock** - Remover todos os dados de teste/exemplo do banco de dados para deixar o app limpo

---

## 1. Campo de Data por Extenso

### O que será feito

Adicionar suporte a um novo campo dinâmico `{{data_extenso}}` no sistema de geração de PDF que sempre exibirá a **data atual** no formato por extenso em português.

**Exemplo:** `29 de Janeiro de 2026`

### Alterações técnicas

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-pdf/index.ts` | Adicionar função `formatDateExtended()` e incluir campo `data_extenso` nos dados do template |

### Nova função helper

```typescript
const formatDateExtended = (): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return `${day} de ${month} de ${year}`;
};
```

### Campos disponíveis após a mudança

Os templates `.docx` poderão usar:
- `{{data_extenso}}` - Data atual por extenso (ex: "29 de Janeiro de 2026")
- `{{data}}` - Data de criação da proposta (DD/MM/YYYY)
- Todos os outros campos existentes

---

## 2. Limpeza de Dados Mock

### Dados atuais no banco

| Tabela | Quantidade | Dados |
|--------|------------|-------|
| proposals | 4 | Propostas de teste (Cliente Teste PDF, João, etc.) |
| proposal_items | - | Itens dessas propostas |
| items | 1 | "Retífica Industrial X500" |
| templates | 2 | Template Teste 1 e 2 |
| categories | 0 | Vazio |
| organizations | 1 | Sua organização (manter) |
| profiles | 1 | Seu perfil (manter) |

### O que será removido

Executarei **queries SQL** para limpar:
1. Todas as propostas de teste
2. Todos os itens de proposta
3. Todos os itens do catálogo
4. Todos os templates de teste

### O que será mantido

- **Seu perfil de usuário** - Necessário para login
- **Sua organização** - Vinculada ao seu usuário
- **Estrutura das tabelas** - Intacta e pronta para seus dados

---

## Resumo da Implementação

1. Atualizar Edge Function `generate-pdf` com a nova função de data por extenso
2. Executar SQL para limpar dados mock do banco
3. Testar geração de PDF com o novo campo

---

## Uso do Campo Data por Extenso

Após a implementação, nos seus templates `.docx` você poderá usar:

```
{{data_extenso}}
```

E isso será substituído automaticamente pela data atual, por exemplo:

```
29 de Janeiro de 2026
```
