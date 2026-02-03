import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  Users,
  Package,
  Send,
  AlertTriangle,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  isLoading?: boolean;
  href?: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, isLoading, href }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="stat-card">
        <CardContent className="p-0">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <CardContent className="p-0 h-full">
      <div className="flex items-start justify-between h-full">
        <div className="space-y-2 flex flex-col">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <div className="min-h-[20px]">
            {change && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                changeType === 'positive'
                  ? 'text-green-600 dark:text-green-400'
                  : changeType === 'negative'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {changeType === 'positive' ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : changeType === 'negative' ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : null}
              {change}
            </div>
          )}
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        <Card className="stat-card hover-lift cursor-pointer group">
          {cardContent}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="stat-card">
      {cardContent}
    </Card>
  );
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function Dashboard() {
  const { profile } = useAuth();
  const { metrics, isLoading } = useDashboardMetrics();
  const isAdmin = profile?.role === 'admin';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const navigate = useNavigate();

  const pieData = [
    { name: 'Rascunho', value: metrics.proposals.byStatus.draft, color: 'hsl(var(--muted-foreground))', status: 'draft' },
    { name: 'Enviadas', value: metrics.proposals.byStatus.sent, color: 'hsl(var(--primary))', status: 'sent' },
    { name: 'Expiradas', value: metrics.proposals.byStatus.expired, color: 'hsl(var(--destructive))', status: 'expired' },
  ].filter(item => item.value > 0);

  const handlePieClick = (data: { status: string }) => {
    navigate(`/proposals?status=${data.status}`);
  };

  const proposalsChange = metrics.previousMonthComparison.proposalsChange;
  const valueChange = metrics.previousMonthComparison.valueChange;

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
          value={metrics.proposals.total.toString()}
          change={proposalsChange !== 0 ? `${proposalsChange > 0 ? '+' : ''}${proposalsChange}% vs mês anterior` : undefined}
          changeType={proposalsChange > 0 ? 'positive' : proposalsChange < 0 ? 'negative' : 'neutral'}
          icon={FileText}
          isLoading={isLoading}
        />
        <StatCard
          title="Valor Total"
          value={formatCompactCurrency(metrics.proposals.totalValue)}
          change={valueChange !== 0 ? `${valueChange > 0 ? '+' : ''}${valueChange}% vs mês anterior` : undefined}
          changeType={valueChange > 0 ? 'positive' : valueChange < 0 ? 'negative' : 'neutral'}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title={isAdmin ? 'Ticket Médio' : 'Propostas Enviadas'}
          value={isAdmin ? formatCurrency(metrics.proposals.avgValue) : metrics.proposals.byStatus.sent.toString()}
          icon={isAdmin ? TrendingUp : FileCheck}
          isLoading={isLoading}
          href={isAdmin ? undefined : '/proposals?status=sent'}
        />
        <StatCard
          title={isAdmin ? 'Usuários Ativos' : 'Rascunhos'}
          value={isAdmin ? metrics.users.active.toString() : metrics.proposals.byStatus.draft.toString()}
          icon={isAdmin ? Users : Clock}
          isLoading={isLoading}
          href={isAdmin ? '/users' : '/proposals?status=draft'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Chart - Propostas por Período */}
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Propostas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : metrics.monthlyData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma proposta ainda</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'valor' ? formatCurrency(value) : value,
                        name === 'valor' ? 'Valor' : 'Propostas',
                      ]}
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
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Status das Propostas */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Status das Propostas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : pieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Sem dados</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col">
                <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handlePieClick(entry)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        itemStyle={{
                          color: 'hsl(var(--foreground))',
                        }}
                        labelStyle={{
                          color: 'hsl(var(--foreground))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-4 text-xs pt-2 pb-1">
                  {pieData.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className="flex items-center gap-1.5 hover:opacity-70 transition-opacity cursor-pointer py-1 px-2 rounded hover:bg-muted/50"
                      onClick={() => handlePieClick(item)}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">
                        {item.name} ({item.value})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Valor por Período */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Valor por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : metrics.monthlyData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado ainda</p>
                </div>
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => formatCompactCurrency(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Itens Mais Cotados */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Itens Mais Cotados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : metrics.topItems.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item cotado ainda</p>
                </div>
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.topItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={120}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'Cotações']}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : (
                        `${metrics.items.active} itens ativos`
                      )}
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : (
                        `${metrics.users.active} usuários ativos`
                      )}
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24 inline-block" />
                      ) : (
                        `${metrics.templates.active} template${metrics.templates.active !== 1 ? 's' : ''} ativo${metrics.templates.active !== 1 ? 's' : ''}`
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      )}

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card border-l-4 border-l-muted-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : metrics.proposals.byStatus.draft}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Enviadas</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : metrics.proposals.byStatus.sent}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Expiradas</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : metrics.proposals.byStatus.expired}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
