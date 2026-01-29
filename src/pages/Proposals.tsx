import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Search,
  PlusCircle,
  MoreHorizontal,
  Eye,
  Copy,
  FileDown,
  Pencil,
  Filter,
  FileText,
} from 'lucide-react';

// Mock proposals data
const mockProposals = [
  {
    id: '1',
    proposal_number: 'PROP-202501-0001',
    client_name: 'João Silva',
    client_email: 'joao@empresa.com',
    client_company: 'Empresa ABC Ltda',
    vendor_name: 'Ana Santos',
    total_value: 15750.0,
    status: 'sent',
    created_at: '2025-01-28T10:30:00',
    sent_at: '2025-01-28T14:45:00',
  },
  {
    id: '2',
    proposal_number: 'PROP-202501-0002',
    client_name: 'Maria Oliveira',
    client_email: 'maria@tech.com',
    client_company: 'Tech Solutions',
    vendor_name: 'Carlos Silva',
    total_value: 28900.0,
    status: 'draft',
    created_at: '2025-01-27T09:15:00',
    sent_at: null,
  },
  {
    id: '3',
    proposal_number: 'PROP-202501-0003',
    client_name: 'Pedro Costa',
    client_email: 'pedro@industria.com',
    client_company: 'Indústria Nacional',
    vendor_name: 'Ana Santos',
    total_value: 45200.0,
    status: 'sent',
    created_at: '2025-01-25T16:00:00',
    sent_at: '2025-01-26T10:20:00',
  },
  {
    id: '4',
    proposal_number: 'PROP-202501-0004',
    client_name: 'Fernanda Lima',
    client_email: 'fernanda@varejo.com',
    client_company: 'Varejo Express',
    vendor_name: 'Carlos Silva',
    total_value: 8500.0,
    status: 'expired',
    created_at: '2025-01-10T11:30:00',
    sent_at: '2025-01-10T15:00:00',
  },
  {
    id: '5',
    proposal_number: 'PROP-202501-0005',
    client_name: 'Ricardo Santos',
    client_email: 'ricardo@construcao.com',
    client_company: 'Construções RS',
    vendor_name: 'Ana Santos',
    total_value: 67800.0,
    status: 'draft',
    created_at: '2025-01-29T08:00:00',
    sent_at: null,
  },
];

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  expired: 'Expirada',
};

const statusVariants: Record<string, string> = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  expired: 'badge-expired',
};

export default function Proposals() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredProposals = mockProposals.filter((proposal) => {
    const matchesSearch =
      proposal.client_name.toLowerCase().includes(search.toLowerCase()) ||
      proposal.proposal_number.toLowerCase().includes(search.toLowerCase()) ||
      proposal.client_company?.toLowerCase().includes(search.toLowerCase());
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
            {filteredProposals.length} propostas encontradas
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
            {filteredProposals.length === 0 ? (
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
                  {isAdmin && <TableCell>{proposal.vendor_name}</TableCell>}
                  <TableCell>{formatDate(proposal.created_at)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(proposal.total_value)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusVariants[proposal.status]} font-medium`}
                    >
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
                        <DropdownMenuItem className="flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          Duplicar
                        </DropdownMenuItem>
                        {proposal.status !== 'draft' && (
                          <DropdownMenuItem className="flex items-center gap-2">
                            <FileDown className="w-4 h-4" />
                            Baixar PDF
                          </DropdownMenuItem>
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
    </div>
  );
}
