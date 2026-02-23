

## Migração do PDF.co para LightPDF

Substituir o serviço de conversão DOCX para PDF, trocando o PDF.co pelo LightPDF, sem alterar nenhuma outra funcionalidade.

---

## Como funciona a API da LightPDF

A LightPDF usa um fluxo assíncrono em 2 etapas:

```text
1. POST /api/tasks/document/conversion
   - Header: X-API-KEY
   - Body: form-data com file (DOCX) + format ("pdf")
   - Retorna: task_id

2. GET /api/tasks/document/conversion/{task_id}  (polling a cada 1s, max 30s)
   - Header: X-API-KEY
   - Retorna: state (1 = pronto, <0 = erro, 4 = processando)
   - Quando state=1: campo "file" contém URL de download do PDF
```

Base URL: `https://techhk.aoscdn.com`

---

## Alterações Necessárias

### 1. Adicionar secret LIGHTPDF_API_KEY

- Valor: `wxll09r7i3968xh5c`
- Armazenar como secret no backend para uso na Edge Function

### 2. Arquivo: `supabase/functions/generate-pdf/index.ts`

**Substituir a função `convertDocxToPdfWithPdfCo`** (linhas 345-430) por uma nova função `convertDocxToPdfWithLightPdf` que:

- Lê a secret `LIGHTPDF_API_KEY` em vez de `PDFCO_API_KEY`
- **Etapa 1**: Envia o DOCX via `POST https://techhk.aoscdn.com/api/tasks/document/conversion` com `form-data` contendo `file` e `format=pdf`, header `X-API-KEY`
- **Etapa 2**: Faz polling em `GET https://techhk.aoscdn.com/api/tasks/document/conversion/{task_id}` a cada 1 segundo, por no máximo 30 segundos
  - `state === 1` → sucesso, baixa o PDF da URL no campo `file`
  - `state < 0` → erro, lança exceção com mensagem descritiva
  - `state === 4` ou outros → continua polling
- **Etapa 3**: Baixa o PDF da URL retornada e retorna como `Uint8Array`

**Atualizar a chamada** na linha 930: trocar `convertDocxToPdfWithPdfCo` por `convertDocxToPdfWithLightPdf`

**Atualizar o tratamento de erros** (linhas 939-960): trocar referências a "PDF.co" por "LightPDF" nas mensagens de erro, e detectar erros de crédito do LightPDF (status 401/429 e states negativos)

### 3. Nenhuma outra alteração

- Frontend: sem mudanças
- Banco de dados: sem mudanças
- RLS: sem mudanças
- Outras Edge Functions: sem mudanças

---

## Resumo

| Item | Antes | Depois |
|---|---|---|
| Serviço de conversão | PDF.co | LightPDF |
| Secret usada | PDFCO_API_KEY | LIGHTPDF_API_KEY |
| Método de upload | Base64 via JSON | Form-data (file upload direto) |
| Conversão | Síncrona | Assíncrona (polling por task_id) |
| Arquivo alterado | -- | `supabase/functions/generate-pdf/index.ts` |
| Impacto em outras funcionalidades | -- | Nenhum |

