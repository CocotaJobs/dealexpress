import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface InvitationInfo {
  email: string;
  role: 'admin' | 'vendor';
  organizationName: string;
  expiresAt: string;
  isValid: boolean;
  errorMessage?: string;
}

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
  const [isLoadingInvite, setIsLoadingInvite] = useState(!!inviteToken);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Fetch invitation info if token is present
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      if (!inviteToken) return;

      setIsLoadingInvite(true);
      try {
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .select(`
            email,
            role,
            expires_at,
            status,
            organization_id,
            organizations (name)
          `)
          .eq('token', inviteToken)
          .maybeSingle();

        if (inviteError) {
          console.error('Error fetching invitation:', inviteError);
          setInvitationInfo({
            email: inviteEmail,
            role: 'vendor',
            organizationName: '',
            expiresAt: '',
            isValid: false,
            errorMessage: 'Erro ao verificar convite',
          });
          return;
        }

        if (!invitation) {
          setInvitationInfo({
            email: inviteEmail,
            role: 'vendor',
            organizationName: '',
            expiresAt: '',
            isValid: false,
            errorMessage: 'Convite não encontrado ou inválido',
          });
          return;
        }

        if (invitation.status !== 'pending') {
          setInvitationInfo({
            email: invitation.email,
            role: invitation.role,
            organizationName: (invitation.organizations as { name: string })?.name || '',
            expiresAt: invitation.expires_at,
            isValid: false,
            errorMessage: invitation.status === 'accepted' 
              ? 'Este convite já foi utilizado' 
              : 'Este convite expirou',
          });
          return;
        }

        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < new Date()) {
          setInvitationInfo({
            email: invitation.email,
            role: invitation.role,
            organizationName: (invitation.organizations as { name: string })?.name || '',
            expiresAt: invitation.expires_at,
            isValid: false,
            errorMessage: 'Este convite expirou',
          });
          return;
        }

        setInvitationInfo({
          email: invitation.email,
          role: invitation.role,
          organizationName: (invitation.organizations as { name: string })?.name || '',
          expiresAt: invitation.expires_at,
          isValid: true,
        });
        setEmail(invitation.email);
      } catch (err) {
        console.error('Error fetching invitation:', err);
        setInvitationInfo({
          email: inviteEmail,
          role: 'vendor',
          organizationName: '',
          expiresAt: '',
          isValid: false,
          errorMessage: 'Erro ao verificar convite',
        });
      } finally {
        setIsLoadingInvite(false);
      }
    };

    fetchInvitationInfo();
  }, [inviteToken, inviteEmail]);

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula', met: /[A-Z]/.test(password) },
    { label: 'Um número', met: /\d/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if invitation is valid when token is present
    if (inviteToken && invitationInfo && !invitationInfo.isValid) {
      setError(invitationInfo.errorMessage || 'Convite inválido');
      return;
    }

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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
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

        {/* Invitation Info Card */}
        {isLoadingInvite ? (
          <Card className="border-0 shadow-xl mb-6">
            <CardContent className="py-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Verificando convite...</span>
            </CardContent>
          </Card>
        ) : inviteToken && invitationInfo ? (
          <Card className={`border-0 shadow-xl mb-6 ${!invitationInfo.isValid ? 'border-destructive/50' : 'border-primary/50'}`}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${invitationInfo.isValid ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                  <Users className={`w-5 h-5 ${invitationInfo.isValid ? 'text-primary' : 'text-destructive'}`} />
                </div>
                <div className="flex-1">
                  {invitationInfo.isValid ? (
                    <>
                      <p className="font-medium text-foreground">
                        Você foi convidado para fazer parte de
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {invitationInfo.organizationName}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {invitationInfo.role === 'admin' ? 'Administrador' : 'Vendedor'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Expira em {formatDate(invitationInfo.expiresAt)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-destructive">Convite Inválido</p>
                      <p className="text-sm text-muted-foreground">
                        {invitationInfo.errorMessage}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold">Criar sua conta</CardTitle>
            <CardDescription>
              {inviteToken && invitationInfo?.isValid
                ? 'Complete seu cadastro para acessar a organização'
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
                  disabled={!!inviteToken && invitationInfo?.isValid}
                  className="h-11 input-focus disabled:bg-muted"
                />
                {inviteToken && invitationInfo?.isValid && (
                  <p className="text-xs text-muted-foreground">
                    O email foi definido pelo convite e não pode ser alterado
                  </p>
                )}
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
                disabled={isLoading || (inviteToken && invitationInfo && !invitationInfo.isValid)}
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
