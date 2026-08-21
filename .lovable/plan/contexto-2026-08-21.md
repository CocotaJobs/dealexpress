Redeploy da Edge Function `generate-pdf`

## Contexto

O código-fonte de `supabase/functions/generate-pdf/index.ts` já está migrado para a integração com CloudConvert, conforme confirmado no commit atual. No entanto, a versão em produção da edge function ainda está executando a implementação anterior baseada em LightPDF. Nenhuma alteração de código é necessária — apenas uma republicação da função.

## Passo

1. Executar o redeploy da edge function `generate-pdf` na Lovable Cloud / Supabase.

## Resultado esperado

- A edge function `generate-pdf` em produção passa a usar a implementação CloudConvert.
- A geração de PDFs passa a ser processada pelo fluxo de jobs da CloudConvert.

## Restrições

- Não modificar o código-fonte do projeto.
- Não alterar configurações, segredos ou banco de dados.
