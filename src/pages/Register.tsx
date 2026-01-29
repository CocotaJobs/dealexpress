import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteEmail = searchParams.get('email') || '';
  const inviteToken = searchParams.get('token') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Um número', met: /\d/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!passwordRequirements.every((req) => req.met)) {
      setError('A senha não atende aos requisitos mínimos.');
      return;
    }

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-surface p-8">
        <Card className="w-full max-w-md border-0 shadow-xl text-center animate-scale-in">
          <CardContent className="pt-12 pb-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conta criada com sucesso!</h2>
            <p className="text-muted-foreground mb-6">
              Redirecionando para a página de login...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-surface p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground">ProposalFlow</span>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Criar sua conta</CardTitle>
            <CardDescription>
              {inviteToken
                ? 'Você foi convidado para fazer parte da equipe'
                : 'Preencha os dados abaixo para criar sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 input-focus"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!inviteEmail}
                  className="h-11 input-focus disabled:bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10 input-focus"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1 pt-1">
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-xs ${
                          req.met ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            req.met ? 'bg-success' : 'bg-muted-foreground/40'
                          }`}
                        />
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 input-focus"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-primary shadow-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Criar conta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
