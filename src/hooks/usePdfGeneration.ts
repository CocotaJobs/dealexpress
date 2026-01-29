import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PdfGenerationResult {
  pdfUrl: string;
  fileName: string;
}

export function usePdfGeneration() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async (proposalId: string): Promise<PdfGenerationResult | null> => {
    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Erro de autenticação',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return null;
      }

      const response = await supabase.functions.invoke('generate-pdf', {
        body: { proposalId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar PDF');
      }

      const result = response.data as PdfGenerationResult;

      toast({
        title: 'PDF gerado!',
        description: `O arquivo ${result.fileName} foi criado com sucesso.`,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar PDF';
      toast({
        title: 'Erro ao gerar PDF',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const previewPdf = async (proposalId: string) => {
    const result = await generatePdf(proposalId);
    if (result?.pdfUrl) {
      window.open(result.pdfUrl, '_blank');
    }
    return result;
  };

  const downloadPdf = async (proposalId: string) => {
    const result = await generatePdf(proposalId);
    if (result?.pdfUrl) {
      const a = document.createElement('a');
      a.href = result.pdfUrl;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return result;
  };

  return {
    isGenerating,
    generatePdf,
    previewPdf,
    downloadPdf,
  };
}
