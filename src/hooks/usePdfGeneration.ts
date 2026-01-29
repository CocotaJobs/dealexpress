import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PdfGenerationResult {
  pdfUrl: string;
  docxUrl?: string | null;
  fileName: string;
  usedCustomTemplate?: boolean;
}

const LOADING_HTML = `
  <html>
    <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f5f5f5;">
      <div style="text-align:center;">
        <p style="font-size:18px;color:#333;">Gerando PDF...</p>
        <p style="color:#666;">Aguarde um momento</p>
      </div>
    </body>
  </html>
`;

const ERROR_HTML = `
  <html>
    <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f5f5f5;">
      <div style="text-align:center;">
        <p style="font-size:18px;color:#d32f2f;">Erro ao gerar PDF</p>
        <p style="color:#666;">Você pode fechar esta aba.</p>
      </div>
    </body>
  </html>
`;

export function usePdfGeneration() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const withCacheBuster = (url: string) => {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${Date.now()}`;
  };

  /**
   * Helper to open a preview window immediately (before any async operation).
   * Call this BEFORE any `await` in your click handler to avoid popup blocking.
   */
  const openPdfPreviewWindow = (): Window | null => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(LOADING_HTML);
    }
    return newWindow;
  };

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

  /**
   * Generate and preview PDF.
   * @param proposalId - The proposal ID
   * @param existingWindow - Optional pre-opened window (use openPdfPreviewWindow() before any await)
   */
  const previewPdf = async (proposalId: string, existingWindow?: Window | null) => {
    // Use existing window or try to open a new one
    const targetWindow = existingWindow ?? window.open('', '_blank');
    
    // If no window and we tried to open one, popup was blocked
    if (!targetWindow && !existingWindow) {
      toast({
        title: 'Popup bloqueado',
        description: 'Permita popups para este site ou use "Baixar PDF".',
        variant: 'destructive',
      });
      return null;
    }
    
    // Show loading if we just opened the window
    if (targetWindow && !existingWindow) {
      targetWindow.document.write(LOADING_HTML);
    }
    
    const result = await generatePdf(proposalId);
    
    if (result?.pdfUrl && targetWindow) {
      // Avoid showing a cached PDF when using the same public URL
      targetWindow.location.href = withCacheBuster(result.pdfUrl);
    } else if (targetWindow) {
      // Show error message in the window
      try {
        targetWindow.document.open();
        targetWindow.document.write(ERROR_HTML);
        targetWindow.document.close();
      } catch {
        // If we can't write, just close
        targetWindow.close();
      }
    }
    
    return result;
  };

  const downloadPdf = async (proposalId: string) => {
    const result = await generatePdf(proposalId);
    if (result?.pdfUrl) {
      try {
        // Fetch the PDF as blob to avoid cross-origin download issues
        const response = await fetch(withCacheBuster(result.pdfUrl), { cache: 'no-store' });
        const blob = await response.blob();
        
        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Create and click download link
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up object URL
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download via blob failed, opening in new tab:', error);
        // Fallback: open in new tab if download fails
        window.open(withCacheBuster(result.pdfUrl), '_blank');
      }
    }
    return result;
  };

  return {
    isGenerating,
    generatePdf,
    previewPdf,
    downloadPdf,
    openPdfPreviewWindow,
  };
}
