import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock items data
const mockItems = [
  {
    id: '1',
    name: 'Parafusadeira Pro X',
    category: 'Ferramentas Elétricas',
    type: 'product',
    price: 450.0,
    max_discount: 15,
    description: 'Parafusadeira profissional com 2 baterias',
    image_url: null,
  },
  {
    id: '2',
    name: 'Máquina CNC 3000',
    category: 'Máquinas',
    type: 'product',
    price: 28500.0,
    max_discount: 10,
    description: 'Centro de usinagem CNC de alta precisão',
    image_url: null,
  },
  {
    id: '3',
    name: 'Kit Ferramentas Premium',
    category: 'Ferramentas Manuais',
    type: 'product',
    price: 890.0,
    max_discount: 20,
    description: 'Kit completo com 150 peças',
    image_url: null,
  },
  {
    id: '4',
    name: 'Manutenção Preventiva',
    category: 'Serviços',
    type: 'service',
    price: 1500.0,
    max_discount: 5,
    description: 'Serviço de manutenção preventiva mensal',
    image_url: null,
  },
  {
    id: '5',
    name: 'Compressor Industrial 200L',
    category: 'Equipamentos',
    type: 'product',
    price: 4200.0,
    max_discount: 12,
    description: 'Compressor de ar industrial 200 litros',
    image_url: null,
  },
];

interface ProposalItem {
  id: string;
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  max_discount: number;
  subtotal: number;
}

export default function NewProposal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Client data
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientWhatsApp, setClientWhatsApp] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Proposal items
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);

  // Commercial conditions
  const [paymentConditions, setPaymentConditions] = useState('');
  const [validityDays, setValidityDays] = useState(15);

  const filteredItems = mockItems.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addItem = (item: (typeof mockItems)[0]) => {
    const existingItem = proposalItems.find((pi) => pi.item_id === item.id);
    if (existingItem) {
      setProposalItems(
        proposalItems.map((pi) =>
          pi.item_id === item.id
            ? {
                ...pi,
                quantity: pi.quantity + 1,
                subtotal: (pi.quantity + 1) * pi.price * (1 - pi.discount / 100),
              }
            : pi
        )
      );
    } else {
      setProposalItems([
        ...proposalItems,
        {
          id: crypto.randomUUID(),
          item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          discount: 0,
          max_discount: item.max_discount,
          subtotal: item.price,
        },
      ]);
    }
    setIsItemDialogOpen(false);
    setItemSearch('');
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setProposalItems(
      proposalItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.price * (1 - item.discount / 100),
            }
          : item
      )
    );
  };

  const updateItemDiscount = (id: string, discount: number) => {
    if (discount < 0 || discount > 100) return;
    setProposalItems(
      proposalItems.map((item) =>
        item.id === id
          ? {
              ...item,
              discount,
              subtotal: item.quantity * item.price * (1 - discount / 100),
            }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setProposalItems(proposalItems.filter((item) => item.id !== id));
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

  const handleSaveDraft = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast({
      title: 'Rascunho salvo!',
      description: 'A proposta foi salva como rascunho.',
    });
    setIsLoading(false);
    navigate('/proposals');
  };

  const handleSendProposal = async () => {
    if (!clientName || !clientEmail || !clientWhatsApp || proposalItems.length === 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios e adicione pelo menos um item.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    toast({
      title: 'Proposta enviada!',
      description: 'A proposta foi enviada via WhatsApp para o cliente.',
    });
    setIsLoading(false);
    navigate('/proposals');
  };

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Proposta</h1>
          <p className="text-muted-foreground">Preencha os dados da proposta comercial</p>
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
                  <Label htmlFor="clientEmail">
                    Email <span className="text-destructive">*</span>
                  </Label>
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
                  <Label htmlFor="clientWhatsApp">
                    WhatsApp <span className="text-destructive">*</span>
                  </Label>
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
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => addItem(item)}
                            className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-primary">
                                  {formatCurrency(item.price)}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-xs mt-1"
                                >
                                  {item.type === 'product' ? 'Produto' : 'Serviço'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {proposalItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>Nenhum item adicionado</p>
                  <p className="text-sm">Clique em "Adicionar Item" para começar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[100px]">Qtd</TableHead>
                      <TableHead className="w-[100px]">Preço</TableHead>
                      <TableHead className="w-[120px]">Desconto (%)</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposalItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(item.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20 h-8"
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) =>
                                updateItemDiscount(item.id, parseFloat(e.target.value) || 0)
                              }
                              className={`w-20 h-8 ${
                                item.discount > item.max_discount ? 'border-warning' : ''
                              }`}
                            />
                            {item.discount > item.max_discount && (
                              <AlertTriangle className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-warning" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
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
                  placeholder="Ex: 30% de entrada, 70% em 3x sem juros"
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityDays">Validade da Proposta (dias)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  max="90"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 15)}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-card sticky top-6">
            <CardHeader>
              <CardTitle>Resumo da Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Itens</span>
                  <span>{proposalItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Validade</span>
                  <span>{validityDays} dias</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-gradient-primary shadow-primary hover:opacity-90"
                  onClick={handleSendProposal}
                  disabled={isLoading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar via WhatsApp
                </Button>
                <Button variant="outline" className="w-full" disabled={isLoading}>
                  <Eye className="w-4 h-4 mr-2" />
                  Pré-visualizar
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Rascunho
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
