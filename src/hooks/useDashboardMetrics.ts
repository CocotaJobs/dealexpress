import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProposalStats {
  total: number;
  totalValue: number;
  byStatus: {
    draft: number;
    sent: number;
    expired: number;
  };
  avgValue: number;
}

interface MonthlyData {
  month: string;
  propostas: number;
  valor: number;
}

interface TopItem {
  name: string;
  count: number;
}

interface DashboardMetrics {
  proposals: ProposalStats;
  items: {
    total: number;
    active: number;
  };
  users: {
    total: number;
    active: number;
  };
  templates: {
    total: number;
    active: number;
  };
  monthlyData: MonthlyData[];
  topItems: TopItem[];
  previousMonthComparison: {
    proposalsChange: number;
    valueChange: number;
  };
}

const initialMetrics: DashboardMetrics = {
  proposals: {
    total: 0,
    totalValue: 0,
    byStatus: { draft: 0, sent: 0, expired: 0 },
    avgValue: 0,
  },
  items: { total: 0, active: 0 },
  users: { total: 0, active: 0 },
  templates: { total: 0, active: 0 },
  monthlyData: [],
  topItems: [],
  previousMonthComparison: { proposalsChange: 0, valueChange: 0 },
};

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        proposalsResult,
        proposalItemsResult,
        itemsResult,
        usersResult,
        templatesResult,
      ] = await Promise.all([
        supabase.from('proposals').select('id, status, created_at'),
        supabase.from('proposal_items').select('item_name, subtotal, proposal_id'),
        supabase.from('items').select('id, active'),
        supabase.from('profiles_safe').select('id, active'),
        supabase.from('templates').select('id, is_active'),
      ]);

      if (proposalsResult.error) throw proposalsResult.error;
      if (proposalItemsResult.error) throw proposalItemsResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (usersResult.error) throw usersResult.error;
      if (templatesResult.error) throw templatesResult.error;

      const proposals = proposalsResult.data || [];
      const proposalItems = proposalItemsResult.data || [];
      const items = itemsResult.data || [];
      const users = usersResult.data || [];
      const templates = templatesResult.data || [];

      // Calculate proposal totals by summing items
      const proposalTotals: Record<string, number> = {};
      proposalItems.forEach((item) => {
        proposalTotals[item.proposal_id] = (proposalTotals[item.proposal_id] || 0) + Number(item.subtotal);
      });

      const totalValue = Object.values(proposalTotals).reduce((sum, val) => sum + val, 0);

      // Proposals by status
      const byStatus = { draft: 0, sent: 0, expired: 0 };
      proposals.forEach((p) => {
        if (p.status === 'draft') byStatus.draft++;
        else if (p.status === 'sent') byStatus.sent++;
        else if (p.status === 'expired') byStatus.expired++;
      });

      // Monthly data for the last 6 months
      const monthlyData: MonthlyData[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const monthProposals = proposals.filter((p) => {
          const createdAt = new Date(p.created_at);
          return createdAt >= start && createdAt <= end;
        });

        const monthValue = monthProposals.reduce((sum, p) => {
          return sum + (proposalTotals[p.id] || 0);
        }, 0);

        monthlyData.push({
          month: format(monthDate, 'MMM', { locale: ptBR }),
          propostas: monthProposals.length,
          valor: monthValue,
        });
      }

      // Previous month comparison
      const currentMonth = monthlyData[monthlyData.length - 1];
      const previousMonth = monthlyData[monthlyData.length - 2];
      
      let proposalsChange = 0;
      let valueChange = 0;
      
      if (previousMonth && previousMonth.propostas > 0) {
        proposalsChange = ((currentMonth.propostas - previousMonth.propostas) / previousMonth.propostas) * 100;
      }
      if (previousMonth && previousMonth.valor > 0) {
        valueChange = ((currentMonth.valor - previousMonth.valor) / previousMonth.valor) * 100;
      }

      // Top items (most quoted)
      const itemCounts: Record<string, number> = {};
      proposalItems.forEach((item) => {
        const name = item.item_name;
        itemCounts[name] = (itemCounts[name] || 0) + 1;
      });

      const topItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics({
        proposals: {
          total: proposals.length,
          totalValue,
          byStatus,
          avgValue: proposals.length > 0 ? totalValue / proposals.length : 0,
        },
        items: {
          total: items.length,
          active: items.filter((i) => i.active).length,
        },
        users: {
          total: users.length,
          active: users.filter((u) => u.active).length,
        },
        templates: {
          total: templates.length,
          active: templates.filter((t) => t.is_active).length,
        },
        monthlyData,
        topItems,
        previousMonthComparison: {
          proposalsChange: Math.round(proposalsChange),
          valueChange: Math.round(valueChange),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar métricas';
      setError(message);
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics,
  };
}
