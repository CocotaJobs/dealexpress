

## Logo dinâmica por tema (claro/escuro)

### Contexto
A logo atual (`src/assets/dealexpress-logo.png`) é preta e usada em todos os lugares. O usuário enviou uma versão branca (`DealExpress_Logo-2.png`) para usar no tema escuro.

### Alterações

1. **Copiar a logo branca** para `src/assets/dealexpress-logo-white.png`

2. **Criar hook `useThemedLogo`** (`src/hooks/useThemedLogo.ts`):
   - Usa `useTheme()` do next-themes para detectar o tema atual
   - Retorna a logo preta no tema claro, logo branca no tema escuro
   - Trata o caso `system` verificando `prefers-color-scheme`

3. **Atualizar 4 arquivos** que usam a logo para usar o hook:
   - `src/components/layout/AppSidebar.tsx` (sidebar header)
   - `src/pages/Login.tsx` (mobile logo)
   - `src/pages/Register.tsx` (logo do formulário)
   - `src/pages/Index.tsx` (header e footer da landing page)

   Em cada arquivo: substituir o import estático `dealexpressLogo` pelo hook `useThemedLogo()`.

