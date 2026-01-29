
# Correção: Integrar Registro com Supabase Auth

## Problema Identificado
A página de registro (`Register.tsx`) ainda usa um código simulado (mock) que apenas espera 1.5 segundos e mostra uma mensagem de sucesso, mas **não cria a conta no banco de dados**. Por isso, ao tentar fazer login, as credenciais não são reconhecidas.

## Solução

### Arquivo a Modificar
**`src/pages/Register.tsx`**

### Mudanças Necessárias

1. **Importar o hook de autenticação**
   - Adicionar import do `useAuth` do contexto

2. **Conectar ao Supabase Auth**
   - Substituir o mock (`await new Promise(...)`) pela chamada real `signUp(email, password, name)`
   - Tratar erros específicos como "usuário já existe"

3. **Melhorar tratamento de erros**
   - Exibir mensagens amigáveis para erros comuns
   - Tratar caso de email já registrado

4. **Ajustar fluxo pós-registro**
   - Mostrar mensagem de sucesso
   - Redirecionar automaticamente para login

## Código Atualizado

```typescript
// Adicionar import
import { useAuth } from '@/contexts/AuthContext';

// Dentro do componente
const { signUp } = useAuth();

// Substituir o handleSubmit mock pelo real
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Validações existentes...

  setIsLoading(true);

  try {
    const { error: signUpError } = await signUp(email, password, name);
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Este email já está cadastrado.');
      } else {
        setError(signUpError.message);
      }
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }
  } catch (err) {
    setError('Erro ao criar conta. Tente novamente.');
  } finally {
    setIsLoading(false);
  }
};
```

## O Que Acontecerá Após a Correção

1. Ao criar uma conta, os dados serão enviados ao Supabase Auth
2. O trigger `handle_new_user` criará automaticamente:
   - Um registro na tabela `profiles`
   - Uma nova organização (ou associação a um convite existente)
   - O role `admin` para novos usuários
3. O login funcionará normalmente com as credenciais criadas
