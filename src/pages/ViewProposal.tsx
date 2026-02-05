import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Pencil,
  FileDown,
  Send,
  Copy,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProposals, ProposalWithItems } from '@/hooks/useProposals';
import { usePdfGeneration } from '@/hooks/usePdfGeneration';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { PdfPreviewDialog } from '@/components/proposals/PdfPreviewDialog';

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  expired: 'Expirada',
};

const statusVariants: Record<string, string> = {
  draft: 'border-muted-foreground/50 text-muted-foreground',
  sent: 'border-success/50 text-success bg-success/10',
  expired: 'border-destructive/50 text-destructive bg-destructive/10',
};

export default function ViewProposal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { sendProposal, duplicateProposal } = useProposals();
  const { isGenerating, downloadPdf, generatePdf, generatePdfBlobUrl } = usePdfGeneration();

  const [proposal, setProposal] = useState<ProposalWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // PDF Preview Dialog state
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewRemoteUrl, setPreviewRemoteUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposal(id);
    }
  }, [id]);

  const fetchProposal = async (proposalId: string) => {
    try {
      setIsLoading(true);

      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposalError) throw proposalError;

      const { data: items } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposalId);

      const { data: vendorData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', proposalData.created_by)
        .single();

      const total_value = (items || []).reduce((sum, item) => sum + Number(item.subtotal), 0);

      setProposal({
        ...proposalData,
        items: items || [],
        vendor: vendorData || null,
        total_value,
      });
    } catch (error) {
      console.error('Error fetching proposal:', error);
      toast({
        title: 'Erro ao carregar proposta',
        description: 'A proposta não foi encontrada.',
        variant: 'destructive',
      });
      navigate('/proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const handlePreviewDialogClose = (open: boolean) => {
    if (!open && previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
      setPreviewRemoteUrl(null);
      setPreviewFileName('');
    }
    setIsPreviewDialogOpen(open);
  };

  const handlePreviewPdf = async () => {
    if (!proposal) return;

    // Open dialog immediately with loading state
    setIsPreviewDialogOpen(true);
    setIsPreviewing(true);

    // Generate PDF and get blob URL
    const blobResult = await generatePdfBlobUrl(proposal.id);

    if (blobResult) {
      setPreviewBlobUrl(blobResult.blobUrl);
      setPreviewRemoteUrl(blobResult.remoteUrl);
      setPreviewFileName(blobResult.fileName);
    } else {
      setPreviewBlobUrl(null);
      setPreviewRemoteUrl(null);
    }

    setIsPreviewing(false);
  };

  const handleDownloadFromPreview = () => {
    if (proposal) {
      downloadPdf(proposal.id);
    }
  };

  const handleDownloadPdf = () => {
    if (proposal) {
      downloadPdf(proposal.id);
    }
  };

  const handleSendProposal = async () => {
    if (!proposal) return;

    if (!proposal.client_whatsapp) {
      toast({
        title: 'WhatsApp não informado',
        description: 'Adicione o WhatsApp do cliente para enviar a proposta.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.whatsapp_connected) {
      toast({
        title: 'WhatsApp não conectado',
        description: 'Conecte seu WhatsApp antes de enviar propostas.',
        variant: 'destructive',
      });
      navigate('/whatsapp');
      return;
    }

    setIsSending(true);

    try {
      const pdfResult = await generatePdf(proposal.id);

      if (pdfResult?.pdfUrl) {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          const whatsappResponse = await supabase.functions.invoke('whatsapp', {
            body: {
              action: 'send-message',
              phone: proposal.client_whatsapp.replace(/\D/g, ''),
              message: `Olá ${proposal.client_name}! Segue a proposta comercial solicitada.`,
              mediaUrl: pdfResult.pdfUrl,
              mediaType: 'document',
              fileName: pdfResult.fileName,
            },
          });

          if (whatsappResponse.error) {
            console.error('Error sending WhatsApp:', whatsappResponse.error);
            toast({
              title: 'PDF gerado, mas houve erro no envio',
              description: 'O PDF foi gerado. Tente enviar manualmente.',
              variant: 'destructive',
            });
          } else {
            await sendProposal(proposal.id);
            toast({
              title: 'Proposta enviada!',
              description: `A proposta foi enviada para ${proposal.client_whatsapp} via WhatsApp.`,
            });
            fetchProposal(proposal.id);
          }
        }
      }
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast({
        title: 'Erro ao enviar proposta',
        description: 'Ocorreu um erro ao enviar a proposta.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDuplicate = async () => {
    if (!proposal) return;
    setIsDuplicating(true);
    const result = await duplicateProposal(proposal.id);
    setIsDuplicating(false);
    if (result.data) {
      navigate(`/proposals/${result.data.id}/edit`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{proposal.proposal_number}</h1>
              <Badge variant="outline" className={`${statusVariants[proposal.status]} font-medium`}>
                {statusLabels[proposal.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">Proposta para {proposal.client_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {proposal.status === 'draft' && (
            <Button asChild variant="outline">
              <Link to={`/proposals/${proposal.id}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            {isDuplicating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Duplicar
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Baixar PDF
          </Button>
          {proposal.status === 'draft' && (
            <Button
              onClick={handleSendProposal}
              disabled={isSending || isGenerating}
              className="bg-gradient-primary shadow-primary hover:opacity-90"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar via WhatsApp
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Client Data */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{proposal.client_name}</p>
                  </div>
                </div>
                {proposal.client_company && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Empresa</p>
                      <p className="font-medium">{proposal.client_company}</p>
                    </div>
                  </div>
                )}
                {proposal.client_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{proposal.client_email}</p>
                    </div>
                  </div>
                )}
                {proposal.client_whatsapp && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">WhatsApp</p>
                      <p className="font-medium">{proposal.client_whatsapp}</p>
                    </div>
                  </div>
                )}
                {proposal.client_address && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      <p className="font-medium">{proposal.client_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Itens da Proposta</CardTitle>
              <CardDescription>
                {proposal.items?.length || 0} {(proposal.items?.length || 0) === 1 ? 'item' : 'itens'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-center">Desc.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposal.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(item.item_price))}</TableCell>
                      <TableCell className="text-center">{Number(item.discount).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(Number(item.subtotal))}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-primary/10">
                    <TableCell colSpan={4} className="text-right font-bold">
                      TOTAL:
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(proposal.total_value || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment Conditions */}
          {proposal.payment_conditions && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Condições de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{proposal.payment_conditions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">{formatDate(proposal.created_at)}</p>
                </div>
              </div>
              {proposal.sent_at && (
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Enviada em</p>
                    <p className="font-medium">{formatDate(proposal.sent_at)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Válida por</p>
                  <p className="font-medium">{proposal.validity_days} dias</p>
                </div>
              </div>
              {proposal.expires_at && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expira em</p>
                    <p className="font-medium">{formatDate(proposal.expires_at)}</p>
                  </div>
                </div>
              )}
              {proposal.vendor && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedor</p>
                    <p className="font-medium">{proposal.vendor.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Value Card */}
          <Card className="shadow-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(proposal.total_value || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={isPreviewDialogOpen}
        onOpenChange={handlePreviewDialogClose}
        blobUrl={previewBlobUrl}
        remoteUrl={previewRemoteUrl}
        fileName={previewFileName}
        isLoading={isPreviewing}
        onDownload={handleDownloadFromPreview}
      />
    </div>
  );
}
