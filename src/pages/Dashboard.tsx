import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  PlusCircle,
  ArrowUpRight,
  FileCheck,
  Users,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// Mock data for charts
const monthlyData = [
  { month: 'Jul', propostas: 12, valor: 45000 },
  { month: 'Ago', propostas: 19, valor: 72000 },
  { month: 'Set', propostas: 15, valor: 58000 },
  { month: 'Out', propostas: 22, valor: 85000 },
  { month: 'Nov', propostas: 28, valor: 112000 },
  { month: 'Dez', propostas: 35, valor: 145000 },
];

const topItemsData = [
  { name: 'Parafusadeira Pro X', count: 45 },
  { name: 'Máquina CNC 3000', count: 38 },
  { name: 'Kit Ferramentas', count: 32 },
  { name: 'Compressor Industrial', count: 28 },
  { name: 'Serra Circular HD', count: 24 },
];

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: React.ElementType;
}

function StatCard({ title, value, change, changeType, icon: Icon }: StatCardProps) {
  return (
    <Card className="stat-card">
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  changeType === 'positive' ? 'text-success' : 'text-destructive'
                }`}
              >
                <ArrowUpRight
                  className={`w-4 h-4 ${changeType === 'negative' ? 'rotate-180' : ''}`}
                />
                {change}
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Aqui está o resumo geral da sua organização'
              : 'Confira suas propostas e métricas'}
          </p>
        </div>
        <Button asChild className="bg-gradient-primary shadow-primary hover:opacity-90">
          <Link to="/proposals/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Proposta
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Propostas"
          value={isAdmin ? '247' : '42'}
          change="+12% vs mês anterior"
          changeType="positive"
          icon={FileText}
        />
        <StatCard
          title="Valor Total"
          value={formatCurrency(isAdmin ? 1250000 : 185000)}
          change="+8% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title={isAdmin ? 'Ticket Médio' : 'Propostas Enviadas'}
          value={isAdmin ? formatCurrency(5060) : '38'}
          change="+5%"
          changeType="positive"
          icon={isAdmin ? TrendingUp : FileCheck}
        />
        <StatCard
          title={isAdmin ? 'Vendedores Ativos' : 'Rascunhos'}
          value={isAdmin ? '8' : '4'}
          icon={isAdmin ? Users : Clock}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Chart - Propostas por Período */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Propostas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="propostas"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Itens Mais Cotados */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Itens Mais Cotados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    width={120}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Admin */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card hover-lift cursor-pointer group">
            <Link to="/items" className="block">
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Package className="w-6 h-6 text-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Gerenciar Itens</p>
                    <p className="text-sm text-muted-foreground">23 itens cadastrados</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="stat-card hover-lift cursor-pointer group">
            <Link to="/users" className="block">
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Users className="w-6 h-6 text-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Gerenciar Usuários</p>
                    <p className="text-sm text-muted-foreground">8 vendedores ativos</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="stat-card hover-lift cursor-pointer group">
            <Link to="/templates" className="block">
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText className="w-6 h-6 text-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Templates</p>
                    <p className="text-sm text-muted-foreground">1 template ativo</p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
