import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrganizationSettings {
  id: string;
  name: string;
  default_shipping: string | null;
}

export function useOrganizationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: orgId } = await supabase.rpc('get_user_organization_id');
      
      if (!orgId) {
        setSettings(null);
        return;
      }

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, default_shipping')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      
      setSettings(data);
    } catch (error) {
      console.error('Error fetching organization settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateDefaultShipping = async (defaultShipping: string) => {
    if (!settings?.id) return { error: 'Organização não encontrada' };

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ default_shipping: defaultShipping.trim() || null })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, default_shipping: defaultShipping.trim() || null } : null);
      
      toast({
        title: 'Configuração salva',
        description: 'O frete padrão foi atualizado com sucesso.',
      });

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar configuração';
      toast({
        title: 'Erro ao salvar',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
    }
  };

  return {
    settings,
    isLoading,
    fetchSettings,
    updateDefaultShipping,
    defaultShipping: settings?.default_shipping || 'A combinar',
  };
}
