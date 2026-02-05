import { useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ExternalLink } from 'lucide-react';
import { PdfCanvasViewer } from '@/components/proposals/PdfCanvasViewer';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blobUrl: string | null;
  remoteUrl?: string | null;
  fileName: string;
  isLoading?: boolean;
  onDownload?: () => void;
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  blobUrl,
  remoteUrl = null,
  fileName,
  isLoading = false,
  onDownload,
}: PdfPreviewDialogProps) {
  // Cleanup blob URL when dialog closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      onOpenChange(newOpen);
    },
    [blobUrl, onOpenChange]
  );

  // Cleanup on unmount if dialog is open with a blob
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleOpenInNewTab = () => {
    const target = remoteUrl ?? blobUrl;
    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {fileName || 'Pré-visualização do PDF'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {blobUrl && !isLoading && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenInNewTab}
                    className="hidden sm:flex"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir em nova guia
                  </Button>
                  {onDownload && (
                    <Button variant="outline" size="sm" onClick={onDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <div>
                  <p className="text-lg font-medium">Gerando PDF...</p>
                  <p className="text-muted-foreground text-sm">Aguarde um momento</p>
                </div>
              </div>
            </div>
          ) : blobUrl ? (
            <div className="w-full h-full">
              <PdfCanvasViewer url={blobUrl} className="w-full h-full" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <p className="text-lg font-medium text-destructive">
                  Erro ao carregar PDF
                </p>
                <p className="text-muted-foreground text-sm">
                  Não foi possível gerar a pré-visualização.
                </p>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
