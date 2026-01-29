import { useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  X,
  FileText,
} from 'lucide-react';
import { useItemsImport, ValidatedRow } from '@/hooks/useItemsImport';
import { cn } from '@/lib/utils';

interface ImportItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  createCategory: (name: string) => Promise<{ data: { id: string; name: string } | null; error: string | null }>;
  onImportSuccess: () => void;
}

export function ImportItemsDialog({
  open,
  onOpenChange,
  categories,
  createCategory,
  onImportSuccess,
}: ImportItemsDialogProps) {
  const {
    rows,
    stats,
    fileName,
    isLoading,
    isParsing,
    parseFile,
    importItems,
    downloadTemplateCSV,
    downloadTemplateExcel,
    reset,
  } = useItemsImport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        parseFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        parseFile(file);
      }
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleImport = async () => {
    const result = await importItems(categories, createCategory);
    if (result.success) {
      onImportSuccess();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusIcon = (status: ValidatedRow['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getRowClass = (status: ValidatedRow['status']) => {
    switch (status) {
      case 'valid':
        return 'bg-green-500/5';
      case 'warning':
        return 'bg-yellow-500/10';
      case 'error':
        return 'bg-destructive/10';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Itens via Planilha
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel (.xlsx) ou CSV para importar itens em massa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Template download buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplateExcel}>
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo Excel
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplateCSV}>
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo CSV
            </Button>
          </div>

          {/* Upload area */}
          {rows.length === 0 && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                'hover:border-primary/50 hover:bg-muted/50',
                isParsing && 'opacity-50 pointer-events-none'
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Arraste seu arquivo aqui</p>
                    <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    .xlsx ou .csv (máx 5MB, até 500 itens)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <>
              {/* File info and stats */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={reset}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {stats.valid} válidos
                  </Badge>
                  {stats.warnings > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      {stats.warnings} avisos
                    </Badge>
                  )}
                  {stats.errors > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <AlertCircle className="w-3 h-3 text-destructive" />
                      {stats.errors} erros
                    </Badge>
                  )}
                </div>
              </div>

              {/* Table */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-center">Desc.</TableHead>
                      <TableHead className="w-[200px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.index} className={getRowClass(row.status)}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.index}
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {row.data.nome || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {row.data.tipo === 'product' ? 'Produto' : 'Serviço'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate">
                          {row.data.categoria || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.data.preco ? formatCurrency(row.data.preco) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.data.desconto_max}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(row.status)}
                            <span className="text-xs max-w-[150px] truncate" title={row.errors.join(', ')}>
                              {row.status === 'valid' 
                                ? 'Válido' 
                                : row.errors[0] || 'Erro'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {rows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={isLoading || stats.valid + stats.warnings === 0}
              className="bg-gradient-primary shadow-primary hover:opacity-90"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importar {stats.valid + stats.warnings} itens
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
