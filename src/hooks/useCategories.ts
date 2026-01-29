import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export function useCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar categorias';
      setError(message);
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name: string) => {
    try {
      // Get user's organization_id
      const { data: orgData, error: orgError } = await supabase
        .rpc('get_user_organization_id');

      if (orgError) throw orgError;

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          name,
          organization_id: orgData,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast({
        title: 'Categoria criada!',
        description: `A categoria "${data.name}" foi criada com sucesso.`,
      });
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar categoria';
      toast({
        title: 'Erro ao criar categoria',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error: message };
    }
  };

  const updateCategory = async (id: string, updates: CategoryUpdate) => {
    try {
      const { data, error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? data : cat)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({
        title: 'Categoria atualizada!',
        description: `A categoria "${data.name}" foi atualizada com sucesso.`,
      });
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar categoria';
      toast({
        title: 'Erro ao atualizar categoria',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error: message };
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .update({ active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      toast({
        title: 'Categoria removida!',
        description: 'A categoria foi removida com sucesso.',
      });
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover categoria';
      toast({
        title: 'Erro ao remover categoria',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
    }
  };

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
