
## Diagnóstico (por que seu template não está sendo aplicado)
Pelos logs do backend (função de geração de PDF), o sistema **encontra e baixa o template ativo**, processa os campos dinâmicos, mas na hora de “renderizar” o conteúdo do template para PDF ocorre um erro:

- **Erro**: `WinAnsi cannot encode "\t" (0x0009)`
- Isso acontece porque o motor de PDF atual (pdf-lib com fontes padrão) **não consegue lidar com TAB (`\t`)** (e alguns outros caracteres especiais).
- Quando esse erro ocorre, o sistema **faz fallback para o template padrão**.
- Por isso, para você, “continua gerando um template sem relação” (na prática, está voltando pro template padrão).

No seu último request inclusive, a resposta veio com:
- `usedCustomTemplate: false` (confirmando o fallback)

## Objetivo
Garantir que, quando existir template ativo, o PDF seja gerado **a partir do conteúdo do seu .docx**, evitando fallback por caracteres inválidos.

## O que vou implementar
### 1) Sanitização de texto antes de medir/desenhar no PDF (correção principal)
Adicionar uma função de “limpeza” aplicada em todo texto que vai para o PDF, principalmente no caminho do template customizado:

- Substituir `\t` (TAB) por espaços
- Normalizar espaços e caracteres invisíveis comuns vindos de DOCX/HTML (ex.: `\u00A0`)
- Substituir aspas “curvas” e travessões por versões simples quando necessário
- Remover caracteres de controle (ex.: `\u0000`–`\u001F`, exceto quebra de linha já tratada)
- Como proteção extra: se ainda assim algum caractere quebrar a medição (`widthOfTextAtSize`), aplicar um fallback por linha removendo o caractere problemático para não derrubar o template inteiro.

**Arquivo:** `supabase/functions/generate-pdf/index.ts`  
**Funções-alvo:** `parseHtmlContent()` e `generatePdfFromHtml()`

### 2) Melhorar logs de diagnóstico (para você e para mim)
Adicionar logs claros quando:
- Template customizado foi encontrado (já existe)
- Houve sanitização (quantidade de substituições, especialmente TABs)
- O template customizado falhou (com “motivo”)
- `usedCustomTemplate` foi true/false (já existe, manter)

### 3) Pequena correção na data por extenso
No `formatDateExtended()`, ajustar “Março” (hoje está como “Marco”, sem cedilha).  
Isso não é o motivo do seu problema, mas é uma correção rápida e importante.

## Resultado esperado após a correção
1) Ao gerar o PDF de uma proposta com template ativo:
   - O conteúdo do PDF deve refletir o **texto e a estrutura** do seu .docx (na medida do renderizador atual)
   - A resposta do backend deve vir com `usedCustomTemplate: true`
2) Não deve mais ocorrer fallback por TAB.

## Limitações (importante alinhar expectativa)
Mesmo com essa correção, o render atual do template é uma conversão DOCX → HTML → “texto estruturado” → PDF.
Isso significa que:
- Ele **não reproduz 100%** a diagramação/estilos do Word (margens complexas, fontes do Word, imagens, tabelas avançadas, posicionamento exato).
- Mas **deve parar de cair no template padrão** e deve gerar algo “relacionado” ao seu template (conteúdo e ordem).

Se você precisar de fidelidade muito alta ao Word (layout idêntico), o caminho costuma exigir um conversor DOCX→PDF mais “pesado” (motor de renderização), o que pode demandar outra abordagem. Primeiro vou destravar o “aplicar template” corretamente (sem fallback).

## Passos de validação (end-to-end)
1) Ir em uma proposta recém-criada e clicar em **Baixar PDF** ou **Pré-visualizar PDF**
2) Confirmar que:
   - O PDF contém o conteúdo do seu template
   - Não aparece mais comportamento de “template padrão”
3) Se ainda ficar diferente do Word, me diga quais partes específicas precisam bater (ex.: logo, cabeçalho, tabelas), que eu proponho uma evolução incremental do render.

## Itens técnicos (para implementação)
- Implementar `sanitizePdfText(input: string): string`
  - `.replace(/\t/g, ' ')`
  - tratar `&nbsp;`, `\u00A0`
  - remover controles `/[\u0000-\u001F\u007F]/g` (preservando o que for necessário)
  - mapear caracteres comuns problemáticos (aspas curvas, travessões)
- Aplicar sanitização:
  - Na saída de `parseHtmlContent()` (em cada linha)
  - No início do loop em `generatePdfFromHtml()` (antes de `widthOfTextAtSize`)
- Guard-rail:
  - `try/catch` ao medir texto; se der erro, logar e desenhar com versão “mais limpa” (ou remover char inválido)
- Ajustar `formatDateExtended()` para “Março”.

