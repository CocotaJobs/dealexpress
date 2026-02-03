-- CORREÇÃO DE SEGURANÇA CRÍTICA
-- A política atual "Anonymous can view invitations by token" permite que QUALQUER pessoa
-- veja TODOS os convites, expondo tokens, emails e dados da organização.

-- 1. Remover a política insegura
DROP POLICY IF EXISTS "Anonymous can view invitations by token" ON public.invitations;

-- 2. Criar uma política segura que só permite visualização pelo próprio token
-- Usuários anônimos só podem ver convites se conhecerem o token específico
-- Isso será validado na aplicação, não via RLS (pois RLS não consegue acessar parâmetros da query)
-- A validação de token é feita no trigger handle_new_user que já bypassa RLS

-- Não precisamos de política anônima - o trigger handle_new_user já tem SECURITY DEFINER
-- e faz SET LOCAL row_security TO off para buscar o convite

-- Política existente "Users can view invitations in their organization" já cobre usuários autenticados