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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  UserCheck,
  Send,
  Users as UsersIcon,
  MessageSquare,
  Clock,
  Shield,
  ShieldOff,
  Copy,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useInvitations } from '@/hooks/useInvitations';
import { Skeleton } from '@/components/ui/skeleton';

export default function Users() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { users, isLoading: usersLoading, toggleUserActive, updateUserRole, isUpdating } = useUsers();
  const {
    pendingInvitations,
    isLoading: invitationsLoading,
    createInvitation,
    cancelInvitation,
    resendInvitation,
    isCreating,
    lastCreatedInvitation,
  } = useInvitations();

  const [search, setSearch] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'vendor'>('vendor');
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'toggle' | 'role';
    userId: string;
    userName: string;
    currentValue: boolean | string;
    newValue: boolean | string;
  } | null>(null);

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

    createInvitation(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          setShowInviteLink(true);
        },
      }
    );
  };

  const handleCopyLink = () => {
    if (lastCreatedInvitation?.inviteLink) {
      navigator.clipboard.writeText(lastCreatedInvitation.inviteLink);
      toast({
        title: 'Link copiado!',
        description: 'O link de convite foi copiado para a área de transferência.',
      });
    }
  };

  const handleCloseInviteDialog = () => {
    setIsInviteDialogOpen(false);
    setInviteEmail('');
    setInviteRole('vendor');
    setShowInviteLink(false);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'toggle') {
      toggleUserActive({
        userId: confirmAction.userId,
        active: confirmAction.newValue as boolean,
      });
    } else if (confirmAction.type === 'role') {
      updateUserRole({
        userId: confirmAction.userId,
        role: confirmAction.newValue as 'admin' | 'vendor',
      });
    }

    setConfirmAction(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeUsersCount = users.filter((u) => u.active).length;
  const whatsappConnectedCount = users.filter((u) => u.whatsapp_connected).length;

  const isLoading = usersLoading || invitationsLoading;

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários da organização</p>
        </div>
        {isAdmin && (
          <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseInviteDialog();
            else setIsInviteDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Enviar Convite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {showInviteLink ? 'Convite Criado!' : 'Enviar Convite'}
                </DialogTitle>
                <DialogDescription>
                  {showInviteLink
                    ? 'Copie o link abaixo e envie para o convidado'
                    : 'Envie um convite por email para um novo membro da equipe'}
                </DialogDescription>
              </DialogHeader>

              {showInviteLink && lastCreatedInvitation ? (
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Link de convite:</p>
                    <div className="flex gap-2">
                      <Input
                        value={lastCreatedInvitation.inviteLink}
                        readOnly
                        className="text-xs"
                      />
                      <Button onClick={handleCopyLink} size="icon" variant="outline">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Expira em: {formatDate(lastCreatedInvitation.expiresAt)}
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseInviteDialog}>Fechar</Button>
                  </DialogFooter>
                </div>
              ) : (
                <>
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
                    <Button variant="outline" onClick={handleCloseInviteDialog}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSendInvite}
                      className="bg-gradient-primary shadow-primary hover:opacity-90"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Enviar Convite
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
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
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{activeUsersCount}</p>
                )}
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
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{whatsappConnectedCount}</p>
                )}
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
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                )}
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
        {isLoading ? (
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Usuário</TableHead>
                <TableHead className="font-semibold">Perfil</TableHead>
                <TableHead className="font-semibold">WhatsApp</TableHead>
                <TableHead className="font-semibold text-center">Propostas</TableHead>
                <TableHead className="font-semibold">Cadastro</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                {isAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
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
                        {user.role === 'admin' ? (
                          <><Shield className="w-3 h-3 mr-1" /> Administrador</>
                        ) : (
                          'Vendedor'
                        )}
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
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.id !== profile?.id && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'role',
                                      userId: user.id,
                                      userName: user.name,
                                      currentValue: user.role,
                                      newValue: user.role === 'admin' ? 'vendor' : 'admin',
                                    })
                                  }
                                  className="flex items-center gap-2"
                                >
                                  {user.role === 'admin' ? (
                                    <>
                                      <ShieldOff className="w-4 h-4" />
                                      Tornar Vendedor
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-4 h-4" />
                                      Tornar Administrador
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'toggle',
                                      userId: user.id,
                                      userName: user.name,
                                      currentValue: user.active,
                                      newValue: !user.active,
                                    })
                                  }
                                  className={`flex items-center gap-2 ${
                                    user.active ? 'text-destructive focus:text-destructive' : 'text-success focus:text-success'
                                  }`}
                                >
                                  {user.active ? (
                                    <>
                                      <UserX className="w-4 h-4" />
                                      Desativar Usuário
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4" />
                                      Ativar Usuário
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                            {user.id === profile?.id && (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                Você não pode alterar seu próprio perfil
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pending Invites */}
      {isAdmin && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Convites Pendentes</CardTitle>
            <CardDescription>Convites enviados aguardando cadastro</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Nenhum convite pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invite) => (
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendInvitation(invite)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reenviar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelInvitation(invite.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'toggle' && (
                <>
                  Tem certeza que deseja{' '}
                  <strong>{confirmAction.newValue ? 'ativar' : 'desativar'}</strong> o usuário{' '}
                  <strong>{confirmAction.userName}</strong>?
                  {!confirmAction.newValue && (
                    <span className="block mt-2 text-destructive">
                      O usuário não poderá mais acessar o sistema.
                    </span>
                  )}
                </>
              )}
              {confirmAction?.type === 'role' && (
                <>
                  Tem certeza que deseja alterar o perfil de{' '}
                  <strong>{confirmAction.userName}</strong> para{' '}
                  <strong>
                    {confirmAction.newValue === 'admin' ? 'Administrador' : 'Vendedor'}
                  </strong>
                  ?
                  {confirmAction.newValue === 'admin' && (
                    <span className="block mt-2 text-warning">
                      Administradores têm acesso completo ao sistema.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
