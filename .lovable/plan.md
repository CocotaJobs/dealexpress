# Correção da geração/download de PDF

## O que está acontecendo

A mensagem "Edge Function returned a non-2xx status code" é genérica. Os registros da função de geração de PDF mostram duas falhas reais, nesta ordem:

1. **Serviço de conversão sem créditos (causa principal do erro)**
   A conta do CloudConvert responde `402 – "Your account has run out of conversion credits"`. Sem conversão, nenhum PDF é produzido e a função devolve erro.

2. **Falha ao guardar o documento Word intermediário**
   O envio do arquivo `.docx` para o armazenamento é recusado: o tipo de arquivo `.docx` não está liberado no depósito de arquivos. Isso hoje não impede o PDF (é apenas um arquivo auxiliar), mas gera erro nos registros e impede o download do Word.

Ou seja: o app está funcionando; o serviço externo de conversão é que está sem saldo.

## Plano de ação

1. **Mensagem clara para o usuário**
   Quando a conversão falhar por falta de créditos ou chave inválida, exibir na tela um aviso explícito ("O serviço de conversão de PDF está sem créditos — recarregue a conta do CloudConvert") em vez do erro técnico atual. Ajuste na tela de propostas e no trecho que trata a resposta da função.

2. **Corrigir o armazenamento do arquivo Word**
   Enviar o `.docx` como `application/octet-stream`, que é aceito pelo depósito, eliminando o erro de tipo de arquivo.

3. **Restabelecer a conversão** (ação fora do código)
   Recarregar créditos na conta do CloudConvert, ou informar uma nova chave de API. Depois disso, testar a geração de uma proposta de ponta a ponta.

## Detalhes técnicos

- `supabase/functions/generate-pdf/index.ts` linha ~965: trocar `contentType` do upload do DOCX para `application/octet-stream`.
- Mesma função: a checagem `isCreditsError` já existe e devolve 422; garantir que a mensagem específica chegue ao frontend (hoje o cliente mostra apenas `response.error.message`).
- `src/hooks/usePdfGeneration.ts`: ler o corpo da resposta de erro (`FunctionsHttpError.context`) para exibir o motivo real em vez de "non-2xx status code".
- Nenhuma alteração em políticas de acesso, autenticação ou demais fluxos.

## Precisa da sua decisão

Você prefere recarregar os créditos do CloudConvert, ou quer avaliar a troca por outro serviço de conversão?
