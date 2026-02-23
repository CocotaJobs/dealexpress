import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  PlusCircle,
  MoreHorizontal,
  Eye,
  Copy,
  FileDown,
  Pencil,
  Trash2,
  Filter,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';
import { useProposals } from '@/hooks/useProposals';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function Proposals() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { proposals, isLoading, duplicateProposal, deleteProposal, sendProposal } = useProposals();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const urlStatus = searchParams.get('status');
    return urlStatus && ['draft', 'sent', 'expired'].includes(urlStatus) ? urlStatus : 'all';
  });

  // Sync URL with filter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', statusFilter);
    }
    setSearchParams(searchParams, { replace: true });
  }, [statusFilter, searchParams, setSearchParams]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [markingSentId, setMarkingSentId] = useState<string | null>(null);
  const [isMarkingSent, setIsMarkingSent] = useState(false);

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

  const handleDuplicate = async (id: string) => {
    setIsDuplicating(id);
    await duplicateProposal(id);
    setIsDuplicating(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    await deleteProposal(deletingId);
    setIsDeleting(false);
    setDeletingId(null);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    for (const id of selectedIds) {
      await deleteProposal(id);
    }
    setSelectedIds([]);
    setIsBulkDeleting(false);
    setShowBulkDeleteDialog(false);
  };

  const handleMarkAsSent = async () => {
    if (!markingSentId) return;
    setIsMarkingSent(true);
    await sendProposal(markingSentId);
    setIsMarkingSent(false);
    setMarkingSentId(null);
  };

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.client_name.toLowerCase().includes(search.toLowerCase()) ||
      proposal.proposal_number.toLowerCase().includes(search.toLowerCase()) ||
      (proposal.client_company?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Only draft proposals can be deleted
  const deletableProposals = filteredProposals.filter((p) => p.status === 'draft');
  const selectedDeletableCount = selectedIds.filter((id) =>
    deletableProposals.some((p) => p.id === id)
  ).length;

  const toggleSelectAll = () => {
    if (selectedIds.length === deletableProposals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableProposals.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? 'Todas as Propostas' : 'Minhas Propostas'}
          </h1>
          <p className="text-muted-foreground">
            {isLoading ? '...' : `${filteredProposals.length} propostas encontradas`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir ({selectedIds.length})
            </Button>
          )}
          <Button asChild className="bg-gradient-primary shadow-primary hover:opacity-90">
            <Link to="/proposals/new">
              <PlusCircle className="w-4 h-4 mr-2" />
              Nova Proposta
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, número ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-10">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
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
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    deletableProposals.length > 0 &&
                    selectedIds.length === deletableProposals.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todas"
                />
              </TableHead>
              <TableHead className="font-semibold">Número</TableHead>
              <TableHead className="font-semibold">Cliente</TableHead>
              {isAdmin && <TableHead className="font-semibold">Vendedor</TableHead>}
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="font-semibold text-right">Valor</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  )}
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredProposals.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 8 : 7}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-muted-foreground/50" />
                    <p>Nenhuma proposta encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProposals.map((proposal) => {
                const isDeletable = proposal.status === 'draft';
                const isSelected = selectedIds.includes(proposal.id);

                return (
                  <TableRow
                    key={proposal.id}
                    className={`hover:bg-muted/30 ${isSelected ? 'bg-muted/20' : ''}`}
                  >
                    <TableCell>
                      {isDeletable ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(proposal.id)}
                          aria-label={`Selecionar ${proposal.proposal_number}`}
                        />
                      ) : (
                        <Checkbox disabled className="opacity-30" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{proposal.proposal_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{proposal.client_name}</p>
                        <p className="text-sm text-muted-foreground">{proposal.client_company}</p>
                      </div>
                    </TableCell>
                    {isAdmin && <TableCell>{proposal.vendor?.name || '-'}</TableCell>}
                    <TableCell>{formatDate(proposal.created_at)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(proposal.total_value || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusVariants[proposal.status]} font-medium`}>
                        {statusLabels[proposal.status]}
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
                          <DropdownMenuItem asChild>
                            <Link to={`/proposals/${proposal.id}`} className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {proposal.status === 'draft' && (
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/proposals/${proposal.id}/edit`}
                                className="flex items-center gap-2"
                              >
                                <Pencil className="w-4 h-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(proposal.id)}
                            disabled={isDuplicating === proposal.id}
                          >
                            {isDuplicating === proposal.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            Duplicar
                          </DropdownMenuItem>
                          {proposal.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => setMarkingSentId(proposal.id)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Marcar como Enviada
                            </DropdownMenuItem>
                          )}
                          {proposal.status !== 'draft' && (
                            <DropdownMenuItem className="flex items-center gap-2">
                              <FileDown className="w-4 h-4" />
                              Baixar PDF
                            </DropdownMenuItem>
                          )}
                          {proposal.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeletingId(proposal.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Single Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Proposta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} Propostas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.length} proposta(s) selecionada(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir {selectedIds.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Sent Confirmation Dialog */}
      <AlertDialog open={!!markingSentId} onOpenChange={() => setMarkingSentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Enviada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta proposta como enviada? O status será alterado de "Rascunho" para "Enviada".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarkingSent}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsSent}
              disabled={isMarkingSent}
            >
              {isMarkingSent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}