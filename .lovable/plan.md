Publicar a versão atual com CloudConvert em produção

## Contexto

A mudança do LightPDF para o CloudConvert já está commitada no git (`08a18b9`) e o arquivo `supabase/functions/generate-pdf/index.ts` usa a nova integração. O usuário confirmou que quer publicar a versão atual em produção.

## Passos

1. Verificar resultado do scan de segurança antes de publicar.
2. Se não houver bloqueios críticos, publicar o projeto via Lovable para que o frontend e o backend (edge functions) fiquem em produção.

## Resultado esperado

- A URL publicada `dealexpress.lovable.app` passa a executar a versão com CloudConvert.
- A edge function `generate-pdf` passa a converter DOCX para PDF usando CloudConvert em produção.
