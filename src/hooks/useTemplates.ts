import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Template = Database['public']['Tables']['templates']['Row'];

export interface TemplateWithUploader extends Template {
  uploader?: {
    id: string;
    name: string;
  } | null;
}

export function useTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateWithUploader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch uploader names
      const templatesWithUploaders: TemplateWithUploader[] = await Promise.all(
        (data || []).map(async (template) => {
          if (template.uploaded_by) {
            const { data: uploader } = await supabase
              .from('profiles')
              .select('id, name')
              .eq('id', template.uploaded_by)
              .single();
            return { ...template, uploader };
          }
          return { ...template, uploader: null };
        })
      );

      setTemplates(templatesWithUploaders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar templates';
      setError(message);
      console.error('Error fetching templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const uploadTemplate = async (name: string, file: File) => {
    try {
      // Get user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: orgData, error: orgError } = await supabase
        .rpc('get_user_organization_id');

      if (orgError) throw orgError;

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orgData}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase
        .storage
        .from('templates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Deactivate current active template
      await supabase
        .from('templates')
        .update({ is_active: false })
        .eq('organization_id', orgData)
        .eq('is_active', true);

      // Create template record
      const { data: template, error: insertError } = await supabase
        .from('templates')
        .insert({
          name,
          file_path: fileName,
          organization_id: orgData,
          uploaded_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Template enviado!',
        description: `O template "${name}" foi ativado com sucesso.`,
      });

      await fetchTemplates();
      return { data: template, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar template';
      toast({
        title: 'Erro ao enviar template',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error: message };
    }
  };

  const activateTemplate = async (id: string) => {
    try {
      const { data: orgData } = await supabase.rpc('get_user_organization_id');

      // Deactivate all templates
      await supabase
        .from('templates')
        .update({ is_active: false })
        .eq('organization_id', orgData);

      // Activate selected template
      const { data: template, error: updateError } = await supabase
        .from('templates')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: 'Template ativado!',
        description: `O template "${template.name}" foi ativado.`,
      });

      await fetchTemplates();
      return { data: template, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao ativar template';
      toast({
        title: 'Erro ao ativar template',
        description: message,
        variant: 'destructive',
      });
      return { data: null, error: message };
    }
  };

  const downloadTemplate = async (filePath: string, fileName: string) => {
    try {
      const { data, error: downloadError } = await supabase
        .storage
        .from('templates')
        .download(filePath);

      if (downloadError) throw downloadError;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao baixar template';
      toast({
        title: 'Erro ao baixar template',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
    }
  };

  const deleteTemplate = async (id: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from('templates').remove([filePath]);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: 'Template excluído!',
        description: 'O template foi excluído com sucesso.',
      });
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir template';
      toast({
        title: 'Erro ao excluir template',
        description: message,
        variant: 'destructive',
      });
      return { error: message };
    }
  };

  return {
    templates,
    isLoading,
    error,
    fetchTemplates,
    uploadTemplate,
    activateTemplate,
    downloadTemplate,
    deleteTemplate,
  };
}
