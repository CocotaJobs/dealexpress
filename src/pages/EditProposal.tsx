import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  Send,
  Eye,
  ArrowLeft,
  Loader2,
  FileDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useItems } from '@/hooks/useItems';
import { useProposals, ProposalItemFormData } from '@/hooks/useProposals';
import { usePdfGeneration } from '@/hooks/usePdfGeneration';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export default function EditProposal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { items, isLoading: itemsLoading } = useItems();
  const { updateProposal, sendProposal } = useProposals();
  const { isGenerating, generatePdf, previewPdf } = usePdfGeneration();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [proposalNumber, setProposalNumber] = useState('');

  // Client data
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Proposal items
  const [proposalItems, setProposalItems] = useState<ProposalItemFormData[]>([]);

  // Commercial conditions
  const [paymentConditions, setPaymentConditions] = useState('');
  const [validityDays, setValidityDays] = useState(15);

  useEffect(() => {
    if (id) {
      fetchProposal(id);
    }
  }, [id]);

  const fetchProposal = async (proposalId: string) => {
    try {
      setIsLoading(true);

      const { data: proposal, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (error) throw error;

      if (proposal.status !== 'draft') {
        toast({
          title: 'Proposta não editável',
          description: 'Apenas propostas em rascunho podem ser editadas.',
          variant: 'destructive',
        });
        navigate(`/proposals/${proposalId}`);
        return;
      }

      const { data: itemsData } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposalId);

      setProposalNumber(proposal.proposal_number);
      setClientName(proposal.client_name);
      setClientEmail(proposal.client_email || '');
      setClientWhatsApp(proposal.client_whatsapp || '');
      setClientCompany(proposal.client_company || '');
      setClientAddress(proposal.client_address || '');
      setPaymentConditions(proposal.payment_conditions || '');
      setValidityDays(proposal.validity_days);

      setProposalItems(
        (itemsData || []).map((item) => ({
          item_id: item.item_id || '',
          item_name: item.item_name,
          item_price: Number(item.item_price),
          quantity: item.quantity,
          discount: Number(item.discount),
          subtotal: Number(item.subtotal),
        }))
      );
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

  // Filter active items only
  const activeItems = items.filter((item) => item.active);
  const filteredItems = activeItems.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.category?.name?.toLowerCase().includes(itemSearch.toLowerCase()) ?? false)
  );

  const addItem = (item: (typeof activeItems)[0]) => {
    const existingItem = proposalItems.find((pi) => pi.item_id === item.id);
    if (existingItem) {
      setProposalItems(
        proposalItems.map((pi) =>
          pi.item_id === item.id
            ? {
                ...pi,
                quantity: pi.quantity + 1,
                subtotal: (pi.quantity + 1) * pi.item_price * (1 - pi.discount / 100),
              }
            : pi
        )
      );
    } else {
      setProposalItems([
        ...proposalItems,
        {
          item_id: item.id,
          item_name: item.name,
          item_price: Number(item.price),
          quantity: 1,
          discount: 0,
          max_discount: item.max_discount,
          subtotal: Number(item.price),
        },
      ]);
    }
    setIsItemDialogOpen(false);
    setItemSearch('');
  };

  const updateItemQuantity = (item_id: string, quantity: number) => {
    if (quantity < 1) return;
    setProposalItems(
      proposalItems.map((item) =>
        item.item_id === item_id
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.item_price * (1 - item.discount / 100),
            }
          : item
      )
    );
  };

  const updateItemDiscount = (item_id: string, discount: number) => {
    if (discount < 0 || discount > 100) return;
    setProposalItems(
      proposalItems.map((item) =>
        item.item_id === item_id
          ? {
              ...item,
              discount,
              subtotal: item.quantity * item.item_price * (1 - discount / 100),
            }
          : item
      )
    );
  };

  const removeItem = (item_id: string) => {
    setProposalItems(proposalItems.filter((item) => item.item_id !== item_id));
  };

  const totalValue = proposalItems.reduce((sum, item) => sum + item.subtotal, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const validateForm = () => {
    if (!clientName.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Preencha o nome do cliente.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !id) return;

    setIsSaving(true);
    const result = await updateProposal(
      id,
      {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_whatsapp: clientWhatsApp.trim() || null,
        client_company: clientCompany.trim() || null,
        client_address: clientAddress.trim() || null,
        payment_conditions: paymentConditions.trim() || null,
        validity_days: validityDays,
      },
      proposalItems
    );
    setIsSaving(false);

    if (result.data) {
      navigate(`/proposals/${id}`);
    }
  };

  const handlePreview = async () => {
    if (!validateForm() || !id) return;

    if (proposalItems.length === 0) {
      toast({
        title: 'Sem itens',
        description: 'Adicione pelo menos um item à proposta.',
        variant: 'destructive',
      });
      return;
    }

    setIsPreviewing(true);

    // First save the proposal
    const result = await updateProposal(
      id,
      {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_whatsapp: clientWhatsApp.trim() || null,
        client_company: clientCompany.trim() || null,
        client_address: clientAddress.trim() || null,
        payment_conditions: paymentConditions.trim() || null,
        validity_days: validityDays,
      },
      proposalItems
    );

    if (result.data) {
      await previewPdf(id);
    }

    setIsPreviewing(false);
  };

  const handleSendProposal = async () => {
    if (!validateForm() || !id) return;

    if (!clientWhatsApp.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Preencha o WhatsApp do cliente para enviar a proposta.',
        variant: 'destructive',
      });
      return;
    }

    if (proposalItems.length === 0) {
      toast({
        title: 'Sem itens',
        description: 'Adicione pelo menos um item à proposta.',
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

    // First save the proposal
    const result = await updateProposal(
      id,
      {
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_whatsapp: clientWhatsApp.trim() || null,
        client_company: clientCompany.trim() || null,
        client_address: clientAddress.trim() || null,
        payment_conditions: paymentConditions.trim() || null,
        validity_days: validityDays,
      },
      proposalItems
    );

    if (result.data) {
      // Generate PDF first
      const pdfResult = await generatePdf(id);

      if (pdfResult?.pdfUrl) {
        // Send via WhatsApp
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          const whatsappResponse = await supabase.functions.invoke('whatsapp', {
            body: {
              action: 'send-message',
              phone: clientWhatsApp.replace(/\D/g, ''),
              message: `Olá ${clientName}! Segue a proposta comercial solicitada.`,
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
            await sendProposal(id);
            toast({
              title: 'Proposta enviada!',
              description: `A proposta foi enviada para ${clientWhatsApp} via WhatsApp.`,
            });
          }
        }
      }
    }

    setIsSending(false);
    navigate('/proposals');
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

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar {proposalNumber}</h1>
          <p className="text-muted-foreground">Modifique os dados da proposta comercial</p>
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
              <CardDescription>Informações de contato do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientName">
                    Nome completo <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="email@cliente.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientWhatsApp">WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="clientWhatsApp"
                      value={clientWhatsApp}
                      onChange={(e) => setClientWhatsApp(formatWhatsApp(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientCompany">Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="clientCompany"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      placeholder="Nome da empresa"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Endereço</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="clientAddress"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Endereço completo"
                    className="pl-9 min-h-[80px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Selection */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Itens da Proposta</CardTitle>
                  <CardDescription>Adicione produtos e serviços à proposta</CardDescription>
                </div>
                <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary shadow-primary hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Selecionar Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Buscar por nome ou categoria..."
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {itemsLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="p-4 rounded-lg border border-border">
                              <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-6 w-20" />
                              </div>
                            </div>
                          ))
                        ) : filteredItems.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <p>Nenhum item encontrado</p>
                          </div>
                        ) : (
                          filteredItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => addItem(item)}
                              className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent cursor-pointer transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.category?.name || 'Sem categoria'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-primary">
                                    {formatCurrency(Number(item.price))}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={
                                      item.type === 'product'
                                        ? 'border-blue-500/50 text-blue-600'
                                        : 'border-purple-500/50 text-purple-600'
                                    }
                                  >
                                    {item.type === 'product' ? 'Produto' : 'Serviço'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {proposalItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  <p className="text-lg mb-2">Nenhum item adicionado</p>
                  <p className="text-sm">Clique em "Adicionar Item" para começar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[100px] text-center">Qtd</TableHead>
                      <TableHead className="w-[120px] text-right">Valor Unit.</TableHead>
                      <TableHead className="w-[100px] text-center">Desc. (%)</TableHead>
                      <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposalItems.map((item) => (
                      <TableRow key={item.item_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.max_discount !== undefined && item.max_discount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Desconto máx.: {item.max_discount}%
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.item_id, parseInt(e.target.value) || 1)
                            }
                            className="h-8 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.item_price)}
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max={item.max_discount || 100}
                              value={item.discount}
                              onChange={(e) =>
                                updateItemDiscount(
                                  item.item_id,
                                  Math.min(
                                    parseFloat(e.target.value) || 0,
                                    item.max_discount || 100
                                  )
                                )
                              }
                              className="h-8 text-center pr-6"
                            />
                            {item.max_discount !== undefined &&
                              item.discount > item.max_discount && (
                                <AlertTriangle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-warning" />
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.item_id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Commercial Conditions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Condições Comerciais</CardTitle>
              <CardDescription>Defina as condições de pagamento e validade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentConditions">Condições de Pagamento</Label>
                <Textarea
                  id="paymentConditions"
                  value={paymentConditions}
                  onChange={(e) => setPaymentConditions(e.target.value)}
                  placeholder="Ex: 50% entrada + 50% na entrega"
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityDays">Validade da Proposta (dias)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  max="365"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 15)}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="shadow-card sticky top-6">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Itens:</span>
                <span className="font-medium">{proposalItems.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Validade:</span>
                <span className="font-medium">{validityDays} dias</span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePreview}
                  disabled={isPreviewing || isGenerating}
                >
                  {isPreviewing || isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Visualizar PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
                <Button
                  className="w-full bg-gradient-primary shadow-primary hover:opacity-90"
                  onClick={handleSendProposal}
                  disabled={isSending || isGenerating}
                >
                  {isSending || isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
