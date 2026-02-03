import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type InvitationStatus = Database['public']['Enums']['invitation_status'];

// Interface for invitations from the safe view (no token)
export interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

// Interface for newly created invitation (includes invite link from edge function)
export interface CreatedInvitation {
  email: string;
  role: AppRole;
  inviteLink: string;
  expiresAt: string;
  emailSent: boolean;
}

export function useInvitations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query uses the safe view that excludes the token field
  const { data: invitations = [], isLoading, error } = useQuery({
    queryKey: ['invitations'],
    queryFn: async (): Promise<Invitation[]> => {
      // Use the safe view that doesn't expose tokens
      const { data, error } = await supabase
        .from('invitations_safe' as 'invitations')
        .select('id, email, role, status, expires_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }): Promise<CreatedInvitation> => {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email, role },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Convite enviado!',
        description: data.emailSent 
          ? `Um email foi enviado para ${data.email}` 
          : `O link de convite foi gerado. Copie e envie para ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar convite',
        description: error.message || 'Não foi possível criar o convite.',
        variant: 'destructive',
      });
      console.error('Error creating invitation:', error);
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi cancelado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o convite.',
        variant: 'destructive',
      });
      console.error('Error canceling invitation:', error);
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitation: Invitation): Promise<CreatedInvitation> => {
      // Delete old invitation
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitation.id);

      if (deleteError) throw deleteError;

      // Create new one - the edge function returns the invite link
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email: invitation.email, role: invitation.role },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Convite reenviado!',
        description: data.emailSent 
          ? `Um novo email foi enviado para ${data.email}` 
          : `Um novo link foi gerado para ${data.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reenviar o convite.',
        variant: 'destructive',
      });
      console.error('Error resending invitation:', error);
    },
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  return {
    invitations,
    pendingInvitations,
    isLoading,
    error,
    createInvitation: createInvitation.mutate,
    cancelInvitation: cancelInvitation.mutate,
    resendInvitation: resendInvitation.mutateAsync,
    isCreating: createInvitation.isPending,
    isResending: resendInvitation.isPending,
    // The invite link is now returned from the edge function, not constructed client-side
    lastCreatedInvitation: createInvitation.data,
    lastResendData: resendInvitation.data,
  };
}
