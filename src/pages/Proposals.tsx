import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
  const { proposals, isLoading, duplicateProposal, deleteProposal } = useProposals();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

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

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.client_name.toLowerCase().includes(search.toLowerCase()) ||
      proposal.proposal_number.toLowerCase().includes(search.toLowerCase()) ||
      (proposal.client_company?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <Button asChild className="bg-gradient-primary shadow-primary hover:opacity-90">
          <Link to="/proposals/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Proposta
          </Link>
        </Button>
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
                  colSpan={isAdmin ? 7 : 6}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-muted-foreground/50" />
                    <p>Nenhuma proposta encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProposals.map((proposal) => (
                <TableRow key={proposal.id} className="hover:bg-muted/30">
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
