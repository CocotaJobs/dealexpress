import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Power,
  Package,
  Filter,
  Wrench,
  Image,
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
    technical_specs: 'Voltagem: 12V\nTorque: 35Nm\nCapacidade: 2 baterias de íon-lítio',
    image_url: null,
    active: true,
  },
  {
    id: '2',
    name: 'Máquina CNC 3000',
    category: 'Máquinas',
    type: 'product',
    price: 28500.0,
    max_discount: 10,
    description: 'Centro de usinagem CNC de alta precisão',
    technical_specs: 'Área de trabalho: 300x300x300mm\nPrecisão: 0.01mm\nPotência: 2.2kW',
    image_url: null,
    active: true,
  },
  {
    id: '3',
    name: 'Kit Ferramentas Premium',
    category: 'Ferramentas Manuais',
    type: 'product',
    price: 890.0,
    max_discount: 20,
    description: 'Kit completo com 150 peças',
    technical_specs: '150 peças incluindo chaves, alicates, martelos e acessórios',
    image_url: null,
    active: true,
  },
  {
    id: '4',
    name: 'Manutenção Preventiva',
    category: 'Serviços',
    type: 'service',
    price: 1500.0,
    max_discount: 5,
    description: 'Serviço de manutenção preventiva mensal',
    technical_specs: 'Inclui inspeção completa, limpeza, lubrificação e relatório técnico',
    image_url: null,
    active: true,
  },
  {
    id: '5',
    name: 'Compressor Industrial 200L',
    category: 'Equipamentos',
    type: 'product',
    price: 4200.0,
    max_discount: 12,
    description: 'Compressor de ar industrial 200 litros',
    technical_specs: 'Capacidade: 200L\nPressão máx: 175 PSI\nVazão: 425L/min',
    image_url: null,
    active: true,
  },
  {
    id: '6',
    name: 'Instalação de Equipamentos',
    category: 'Serviços',
    type: 'service',
    price: 800.0,
    max_discount: 0,
    description: 'Serviço de instalação e configuração',
    technical_specs: 'Inclui instalação, configuração inicial e treinamento básico',
    image_url: null,
    active: false,
  },
];

const categories = [
  'Ferramentas Elétricas',
  'Ferramentas Manuais',
  'Máquinas',
  'Equipamentos',
  'Serviços',
];

export default function Items() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<(typeof mockItems)[0] | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState<'product' | 'service'>('product');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTechnicalSpecs, setFormTechnicalSpecs] = useState('');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formActive, setFormActive] = useState(true);

  const resetForm = () => {
    setFormName('');
    setFormCategory('');
    setFormType('product');
    setFormPrice('');
    setFormDescription('');
    setFormTechnicalSpecs('');
    setFormMaxDiscount('');
    setFormActive(true);
    setEditingItem(null);
  };

  const openEditDialog = (item: (typeof mockItems)[0]) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormType(item.type as 'product' | 'service');
    setFormPrice(item.price.toString());
    setFormDescription(item.description);
    setFormTechnicalSpecs(item.technical_specs);
    setFormMaxDiscount(item.max_discount.toString());
    setFormActive(item.active);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formCategory || !formPrice) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, categoria e preço.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: editingItem ? 'Item atualizado!' : 'Item criado!',
      description: `O item "${formName}" foi ${editingItem ? 'atualizado' : 'criado'} com sucesso.`,
    });
    setIsDialogOpen(false);
    resetForm();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredItems = mockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Itens</h1>
          <p className="text-muted-foreground">
            Gerencie produtos e serviços do catálogo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nome do item"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={formType === 'product'}
                        onChange={() => setFormType('product')}
                        className="text-primary"
                      />
                      <Package className="w-4 h-4" />
                      Produto
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        checked={formType === 'service'}
                        onChange={() => setFormType('service')}
                        className="text-primary"
                      />
                      <Wrench className="w-4 h-4" />
                      Serviço
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Preço (R$) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Desconto Máx. (%)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    min="0"
                    max="100"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Breve</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descrição que aparecerá na proposta (máx. 200 caracteres)"
                  maxLength={200}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formDescription.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technicalSpecs">Ficha Técnica</Label>
                <Textarea
                  id="technicalSpecs"
                  value={formTechnicalSpecs}
                  onChange={(e) => setFormTechnicalSpecs(e.target.value)}
                  placeholder="Especificações técnicas completas (uso interno, não aparece na proposta)"
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Status do Item</p>
                  <p className="text-sm text-muted-foreground">
                    Itens inativos não aparecem para seleção
                  </p>
                </div>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-primary shadow-primary hover:opacity-90"
              >
                {editingItem ? 'Salvar Alterações' : 'Criar Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] h-10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="product">Produtos</SelectItem>
                  <SelectItem value="service">Serviços</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="font-semibold">Nome</TableHead>
              <TableHead className="font-semibold">Categoria</TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold text-right">Preço</TableHead>
              <TableHead className="font-semibold text-center">Desc. Máx.</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-8 h-8 text-muted-foreground/50" />
                    <p>Nenhum item encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Image className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {item.type === 'product' ? (
                        <>
                          <Package className="w-3 h-3 mr-1" />
                          Produto
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3 h-3 mr-1" />
                          Serviço
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.price)}
                  </TableCell>
                  <TableCell className="text-center">{item.max_discount}%</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={item.active ? 'badge-sent' : 'badge-expired'}
                    >
                      {item.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(item)}
                          className="flex items-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Power className="w-4 h-4" />
                          {item.active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
