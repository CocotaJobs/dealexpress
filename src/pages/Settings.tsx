import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { Loader2, User, Save, Truck, Building } from 'lucide-react';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { settings: orgSettings, updateDefaultShipping, isLoading: orgLoading } = useOrganizationSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isShippingLoading, setIsShippingLoading] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [defaultShipping, setDefaultShipping] = useState('');

  // Sync default shipping from org settings
  useEffect(() => {
    if (orgSettings?.default_shipping !== undefined) {
      setDefaultShipping(orgSettings.default_shipping || '');
    }
  }, [orgSettings]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar suas alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsShippingLoading(true);
    await updateDefaultShipping(defaultShipping);
    setIsShippingLoading(false);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas informações de perfil</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.name ? getInitials(profile.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profile?.name}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    Função: {profile?.role}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Organization Settings - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Configurações da Organização
              </CardTitle>
              <CardDescription>
                Configurações padrão que afetam todas as propostas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultShipping" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Frete Padrão
                  </Label>
                  <Input
                    id="defaultShipping"
                    value={defaultShipping}
                    onChange={(e) => setDefaultShipping(e.target.value)}
                    placeholder="Ex: A combinar, Grátis, R$ 150,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor padrão para o campo de frete nas propostas. Será usado quando o vendedor não especificar.
                  </p>
                </div>

                <Button type="submit" disabled={isShippingLoading || orgLoading}>
                  {isShippingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configuração
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
