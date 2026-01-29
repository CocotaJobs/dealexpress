import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Loader2,
  FolderPlus,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportItemsDialog } from '@/components/items/ImportItemsDialog';
import { useItems, ItemWithCategory } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';

export default function Items() {
  const { items, isLoading, fetchItems, createItem, updateItem, toggleItemStatus } = useItems();
  const { categories, isLoading: categoriesLoading, createCategory } = useCategories();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState<'product' | 'service'>('product');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTechnicalSpecs, setFormTechnicalSpecs] = useState('');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formActive, setFormActive] = useState(true);

  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const openEditDialog = (item: ItemWithCategory) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category_id || '');
    setFormType(item.type);
    setFormPrice(item.price.toString());
    setFormDescription(item.description || '');
    setFormTechnicalSpecs(item.technical_specs || '');
    setFormMaxDiscount(item.max_discount.toString());
    setFormActive(item.active);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formPrice) {
      return;
    }

    setIsSaving(true);
    const itemData = {
      name: formName,
      category_id: formCategory || null,
      type: formType,
      price: parseFloat(formPrice),
      description: formDescription || null,
      technical_specs: formTechnicalSpecs || null,
      max_discount: parseInt(formMaxDiscount) || 0,
      active: formActive,
    };

    if (editingItem) {
      await updateItem(editingItem.id, itemData);
    } else {
      await createItem(itemData);
    }

    setIsSaving(false);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSaving(true);
    const result = await createCategory(newCategoryName.trim());
    setIsSaving(false);
    if (result.data) {
      setFormCategory(result.data.id);
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
    }
  };

  const handleToggleStatus = async (item: ItemWithCategory) => {
    await toggleItemStatus(item.id, !item.active);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory =
      categoryFilter === 'all' || item.category_id === categoryFilter;
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Importar Planilha
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
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
                  <Label htmlFor="category">Categoria</Label>
                  <div className="flex gap-2">
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesLoading ? (
                          <SelectItem value="loading" disabled>
                            Carregando...
                          </SelectItem>
                        ) : categories.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            Nenhuma categoria
                          </SelectItem>
                        ) : (
                          categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" type="button">
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nova Categoria</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="categoryName">Nome da Categoria</Label>
                            <Input
                              id="categoryName"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Ex: Ferramentas Elétricas"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsCategoryDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateCategory}
                            disabled={isSaving || !newCategoryName.trim()}
                          >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Criar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
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
                disabled={isSaving || !formName || !formPrice}
                className="bg-gradient-primary shadow-primary hover:opacity-90"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingItem ? 'Salvar Alterações' : 'Criar Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Import Dialog */}
      <ImportItemsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        categories={categories}
        createCategory={createCategory}
        onImportSuccess={fetchItems}
      />

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
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="w-10 h-10 rounded-lg" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredItems.length === 0 ? (
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
                  <TableCell>{item.category?.name || '-'}</TableCell>
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
                    {formatCurrency(Number(item.price))}
                  </TableCell>
                  <TableCell className="text-center">{item.max_discount}%</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.active
                          ? 'border-success/50 text-success bg-success/10'
                          : 'border-muted-foreground/50 text-muted-foreground'
                      }
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
                        <DropdownMenuItem onClick={() => openEditDialog(item)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(item)}>
                          <Power className="w-4 h-4 mr-2" />
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
