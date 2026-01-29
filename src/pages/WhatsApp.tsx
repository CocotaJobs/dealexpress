import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, QrCode, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WhatsApp() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    setShowQRCode(true);

    // Simulate QR code scanning and connection
    await new Promise((resolve) => setTimeout(resolve, 5000));

    updateUser({ whatsapp_connected: true, whatsapp_session_id: 'session-' + Date.now() });
    setShowQRCode(false);
    setIsConnecting(false);

    toast({
      title: 'WhatsApp conectado!',
      description: 'Sua conta foi conectada com sucesso.',
    });
  };

  const handleDisconnect = () => {
    updateUser({ whatsapp_connected: false, whatsapp_session_id: undefined });
    toast({
      title: 'WhatsApp desconectado',
      description: 'Sua conta foi desconectada.',
    });
  };

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conexão WhatsApp</h1>
        <p className="text-muted-foreground">
          Conecte sua conta do WhatsApp para enviar propostas
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Status Card */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Status da Conexão
              </CardTitle>
              {user?.whatsapp_connected ? (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Desconectado</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {user?.whatsapp_connected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm">
                    Seu WhatsApp está conectado e pronto para enviar propostas. As mensagens serão
                    enviadas do seu número pessoal.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Desconectar
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm">
                    Conecte seu WhatsApp para poder enviar propostas diretamente aos seus clientes.
                    Escaneie o QR Code com o aplicativo WhatsApp no seu celular.
                  </p>
                </div>
                {!showQRCode ? (
                  <Button
                    onClick={handleConnect}
                    className="bg-gradient-primary shadow-primary hover:opacity-90"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-8 rounded-xl bg-white border-2 border-dashed border-border flex flex-col items-center justify-center">
                      {isConnecting ? (
                        <>
                          <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Aguardando leitura do QR Code...
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground text-center max-w-xs">
                            Abra o WhatsApp no seu celular → Vá em "Aparelhos conectados" → Toque em
                            "Conectar aparelho" → Escaneie o QR Code acima
                          </p>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-16 h-16 text-success mb-4" />
                          <p className="font-medium text-success">Conectado com sucesso!</p>
                        </>
                      )}
                    </div>
                    {isConnecting && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowQRCode(false);
                          setIsConnecting(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
            <CardDescription>Entenda como o envio de propostas funciona</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Conecte seu WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Escaneie o QR Code com o WhatsApp do seu celular
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Crie uma proposta</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione os dados do cliente e os itens da proposta
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Envie via WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    O PDF da proposta será enviado automaticamente para o cliente
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
