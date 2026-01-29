import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DialogDescription,
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
import {
  Search,
  Plus,
  MoreHorizontal,
  UserX,
  Send,
  Users as UsersIcon,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock users data
const mockUsers = [
  {
    id: '1',
    name: 'Carlos Silva',
    email: 'carlos@proposalflow.com',
    role: 'admin',
    whatsapp_connected: true,
    proposals_count: 85,
    created_at: '2024-06-15T10:00:00',
    active: true,
  },
  {
    id: '2',
    name: 'Ana Santos',
    email: 'ana@proposalflow.com',
    role: 'vendor',
    whatsapp_connected: true,
    proposals_count: 42,
    created_at: '2024-08-20T14:30:00',
    active: true,
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro@proposalflow.com',
    role: 'vendor',
    whatsapp_connected: false,
    proposals_count: 28,
    created_at: '2024-09-10T09:15:00',
    active: true,
  },
  {
    id: '4',
    name: 'Maria Oliveira',
    email: 'maria@proposalflow.com',
    role: 'vendor',
    whatsapp_connected: true,
    proposals_count: 56,
    created_at: '2024-07-05T16:45:00',
    active: true,
  },
  {
    id: '5',
    name: 'Ricardo Ferreira',
    email: 'ricardo@proposalflow.com',
    role: 'vendor',
    whatsapp_connected: false,
    proposals_count: 12,
    created_at: '2025-01-10T11:20:00',
    active: false,
  },
];

const mockInvites = [
  {
    id: '1',
    email: 'novo.vendedor@empresa.com',
    role: 'vendor',
    status: 'pending',
    expires_at: '2025-02-05T10:00:00',
    created_at: '2025-01-29T10:00:00',
  },
  {
    id: '2',
    email: 'gerente@empresa.com',
    role: 'admin',
    status: 'used',
    expires_at: '2025-01-20T10:00:00',
    created_at: '2025-01-13T10:00:00',
  },
];

export default function Users() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'vendor'>('vendor');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const handleSendInvite = () => {
    if (!inviteEmail) {
      toast({
        title: 'Email obrigatório',
        description: 'Informe o email do convidado.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Convite enviado!',
      description: `Um convite foi enviado para ${inviteEmail}`,
    });
    setIsInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('vendor');
  };

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários da organização</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Enviar Convite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Convite</DialogTitle>
              <DialogDescription>
                Envie um convite por email para um novo membro da equipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email do convidado</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Perfil</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'vendor')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">Vendedor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteRole === 'admin'
                    ? 'Acesso completo a todas as funcionalidades'
                    : 'Acesso restrito às próprias propostas'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendInvite}
                className="bg-gradient-primary shadow-primary hover:opacity-90"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockUsers.filter((u) => u.active).length}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockUsers.filter((u) => u.whatsapp_connected).length}
                </p>
                <p className="text-sm text-muted-foreground">WhatsApp Conectado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {mockInvites.filter((i) => i.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Convites Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Usuário</TableHead>
              <TableHead className="font-semibold">Perfil</TableHead>
              <TableHead className="font-semibold">WhatsApp</TableHead>
              <TableHead className="font-semibold text-center">Propostas</TableHead>
              <TableHead className="font-semibold">Cadastro</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.whatsapp_connected ? 'bg-success' : 'bg-destructive'
                      }`}
                    />
                    <span className="text-sm">
                      {user.whatsapp_connected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">{user.proposals_count}</TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={user.active ? 'badge-sent' : 'badge-expired'}
                  >
                    {user.active ? 'Ativo' : 'Inativo'}
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
                      <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive">
                        <UserX className="w-4 h-4" />
                        {user.active ? 'Desativar' : 'Ativar'} Usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pending Invites */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Convites Pendentes</CardTitle>
          <CardDescription>Convites enviados aguardando cadastro</CardDescription>
        </CardHeader>
        <CardContent>
          {mockInvites.filter((i) => i.status === 'pending').length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhum convite pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockInvites
                .filter((i) => i.status === 'pending')
                .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Perfil: {invite.role === 'admin' ? 'Administrador' : 'Vendedor'} • Expira em{' '}
                        {formatDate(invite.expires_at)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Reenviar
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
