import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  whatsapp_connected: boolean;
  proposals_count: number;
  created_at: string;
  active: boolean;
}

export function useUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Fetch profiles from the secure view (hides emails from non-admins)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles_safe')
        .select('id, name, email, whatsapp_connected, created_at, active');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) return [];

      // Fetch roles for all users
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Fetch proposal counts for each user
      const { data: proposalCounts, error: proposalsError } = await supabase
        .from('proposals')
        .select('created_by');

      if (proposalsError) throw proposalsError;

      // Build a map of user_id -> proposal count
      const countMap = new Map<string, number>();
      proposalCounts?.forEach(p => {
        const current = countMap.get(p.created_by) || 0;
        countMap.set(p.created_by, current + 1);
      });

      // Build a map of user_id -> role
      const roleMap = new Map<string, AppRole>();
      roles?.forEach(r => {
        roleMap.set(r.user_id, r.role);
      });

      // Combine data
      return profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: roleMap.get(profile.id) || 'vendor',
        whatsapp_connected: profile.whatsapp_connected,
        proposals_count: countMap.get(profile.id) || 0,
        created_at: profile.created_at,
        active: profile.active,
      }));
    },
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ active })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: variables.active ? 'Usuário ativado' : 'Usuário desativado',
        description: `O usuário foi ${variables.active ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do usuário.',
        variant: 'destructive',
      });
      console.error('Error toggling user active:', error);
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, delete existing role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Then, insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (insertError) throw insertError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Perfil alterado',
        description: `O usuário agora é ${variables.role === 'admin' ? 'Administrador' : 'Vendedor'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o perfil do usuário.',
        variant: 'destructive',
      });
      console.error('Error updating user role:', error);
    },
  });

  return {
    users,
    isLoading,
    error,
    toggleUserActive: toggleUserActive.mutate,
    updateUserRole: updateUserRole.mutate,
    isUpdating: toggleUserActive.isPending || updateUserRole.isPending,
  };
}
