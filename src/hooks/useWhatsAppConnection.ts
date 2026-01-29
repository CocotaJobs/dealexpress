import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppConnectionState {
  isConnecting: boolean;
  isChecking: boolean;
  showQRCode: boolean;
  qrCodeBase64: string | null;
  error: string | null;
}

export function useWhatsAppConnection() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const pollingRef = useRef<number | null>(null);
  
  const [state, setState] = useState<WhatsAppConnectionState>({
    isConnecting: false,
    isChecking: false,
    showQRCode: false,
    qrCodeBase64: null,
    error: null,
  });

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        body: { action: 'status' },
      });

      if (error) throw error;

      if (data.connected) {
        stopPolling();
        await refreshProfile();
        setState(prev => ({
          ...prev,
          isConnecting: false,
          showQRCode: false,
          qrCodeBase64: null,
        }));
        toast({
          title: 'WhatsApp conectado!',
          description: 'Sua conta foi conectada com sucesso.',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking status:', error);
      return false;
    }
  }, [refreshProfile, stopPolling, toast]);

  const startPolling = useCallback(() => {
    stopPolling();
    
    // Poll every 3 seconds
    pollingRef.current = window.setInterval(async () => {
      const isConnected = await checkStatus();
      if (isConnected) {
        stopPolling();
      }
    }, 3000);
  }, [checkStatus, stopPolling]);

  const connect = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isConnecting: true,
      showQRCode: true,
      error: null,
      qrCodeBase64: null,
    }));

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        body: { action: 'create' },
      });

      if (error) throw error;

      if (data.connected) {
        // Already connected
        await refreshProfile();
        setState(prev => ({
          ...prev,
          isConnecting: false,
          showQRCode: false,
        }));
        toast({
          title: 'WhatsApp já conectado!',
          description: 'Sua conta já estava conectada.',
        });
        return;
      }

      if (data.qrcode) {
        setState(prev => ({
          ...prev,
          qrCodeBase64: data.qrcode,
        }));
        startPolling();
      } else {
        throw new Error('QR Code não recebido');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        showQRCode: false,
        error: errorMessage,
      }));
      toast({
        title: 'Erro ao conectar',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [refreshProfile, startPolling, toast]);

  const disconnect = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const { error } = await supabase.functions.invoke('whatsapp', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      await refreshProfile();
      toast({
        title: 'WhatsApp desconectado',
        description: 'Sua conta foi desconectada.',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Erro ao desconectar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, isChecking: false }));
    }
  }, [refreshProfile, toast]);

  const cancel = useCallback(() => {
    stopPolling();
    setState({
      isConnecting: false,
      isChecking: false,
      showQRCode: false,
      qrCodeBase64: null,
      error: null,
    });
  }, [stopPolling]);

  return {
    ...state,
    isWhatsAppConnected: profile?.whatsapp_connected ?? false,
    connect,
    disconnect,
    cancel,
    checkStatus,
  };
}
