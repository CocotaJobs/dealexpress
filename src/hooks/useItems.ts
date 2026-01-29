import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Item = Database['public']['Tables']['items']['Row'];
type ItemInsert = Database['public']['Tables']['items']['Insert'];
type ItemUpdate = Database['public']['Tables']['items']['Update'];

export interface ItemWithCategory extends Item {
  category?: {
    id: string;
    name: string;
  } | null;
}

export function useItems() {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('items')
        .select(`
          *,
          category:categories(id, name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setItems(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar itens';
      setError(message);
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (item: Omit<ItemInsert, 'organization_id'>) => {
    try {
      // Get user's organization_id
      const { data: orgData, error: orgError } = await supabase
        .rpc('get_user_organization_id');

      if (orgError) throw orgError;

      const { data, error: insertError } = await supabase
        .from('items')
        .insert({
          ...item,
          organization_id: orgData,
        })
        .select(`
          *,
          category:categories(id, name)
        `)
        .single();

      if (insertError) throw insertError;

      setItems((prev) => [data, ...prev]);
      toast({
        title: 'Item criado!',
        description: `O item "${data.name}" foi criado com sucesso.`,
      });
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar item';
      toast({
        title: 'Erro ao criar item',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error: message };
    }
  };

  const updateItem = async (id: string, updates: ItemUpdate) => {
    try {
      const { data, error: updateError } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          category:categories(id, name)
        `)
        .single();

      if (updateError) throw updateError;

      setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
      toast({
        title: 'Item atualizado!',
        description: `O item "${data.name}" foi atualizado com sucesso.`,
      });
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar item';
      toast({
        title: 'Erro ao atualizar item',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error: message };
    }
  };

  const toggleItemStatus = async (id: string, active: boolean) => {
    return updateItem(id, { active });
  };

  return {
    items,
    isLoading,
    error,
    fetchItems,
    createItem,
    updateItem,
    toggleItemStatus,
  };
}
