import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, FileText, CheckCircle, Clock, X, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTemplates } from '@/hooks/useTemplates';
import { Skeleton } from '@/components/ui/skeleton';

const dynamicFields = [
  { field: '{{cliente_nome}}', description: 'Nome completo do cliente' },
  { field: '{{cliente_email}}', description: 'Email do cliente' },
  { field: '{{cliente_whatsapp}}', description: 'WhatsApp do cliente' },
  { field: '{{cliente_empresa}}', description: 'Nome da empresa do cliente' },
  { field: '{{cliente_endereco}}', description: 'Endereço do cliente' },
  { field: '{{data}}', description: 'Data de geração da proposta' },
  { field: '{{numero_proposta}}', description: 'Número único da proposta' },
  { field: '{{vendedor_nome}}', description: 'Nome do vendedor' },
  { field: '{{tabela_itens}}', description: 'Tabela com itens da proposta' },
  { field: '{{valor_total}}', description: 'Valor total da proposta' },
  { field: '{{condicoes_pagamento}}', description: 'Condições de pagamento' },
  { field: '{{validade_proposta}}', description: 'Data de validade' },
];

export default function Templates() {
  const { toast } = useToast();
  const { templates, isLoading, uploadTemplate, activateTemplate, downloadTemplate } = useTemplates();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.docx')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Apenas arquivos .docx são permitidos.',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!templateName || !selectedFile) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e selecione um arquivo.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const result = await uploadTemplate(templateName, selectedFile);
    setIsUploading(false);

    if (result.data) {
      setIsUploadDialogOpen(false);
      setTemplateName('');
      setSelectedFile(null);
    }
  };

  const handleDownload = async (filePath: string, name: string) => {
    await downloadTemplate(filePath, `${name}.docx`);
  };

  const handleActivate = async (id: string) => {
    await activateTemplate(id);
  };

  const activeTemplate = templates.find((t) => t.is_active);
  const inactiveTemplates = templates.filter((t) => !t.is_active);

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground">Gerencie os templates de propostas</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-primary hover:opacity-90">
              <Upload className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload de Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Nome do Template</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Template Proposta v3"
                />
              </div>
              <div className="space-y-2">
                <Label>Arquivo (.docx)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        <span className="font-medium">{selectedFile.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFile(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Clique para selecionar ou arraste o arquivo
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Apenas arquivos .docx
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-warning">Atenção</p>
                <p className="text-muted-foreground">
                  Ao fazer upload, o template atual será desativado automaticamente.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-gradient-primary shadow-primary hover:opacity-90"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Fazer Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Template */}
        <div className="space-y-6">
          <Card className="shadow-card border-2 border-success/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Template Ativo
                </CardTitle>
                <Badge className="bg-success text-success-foreground">Ativo</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ) : activeTemplate ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activeTemplate.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Enviado por {activeTemplate.uploader?.name || 'Desconhecido'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Ativado em {formatDate(activeTemplate.created_at)}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownload(activeTemplate.file_path, activeTemplate.name)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Baixar Template
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum template ativo</p>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de um template para começar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Templates */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Templates Anteriores</CardTitle>
              <CardDescription>Histórico de templates desativados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-5 h-5" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : inactiveTemplates.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Nenhum template anterior
                </div>
              ) : (
                <div className="space-y-3">
                  {inactiveTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(template.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(template.file_path, template.name)}
                        >
                          Baixar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(template.id)}
                        >
                          Ativar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Fields Reference */}
        <Card className="shadow-card h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Campos Dinâmicos
            </CardTitle>
            <CardDescription>
              Use estes campos no seu template Word para preenchimento automático
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dynamicFields.map((field) => (
                <div
                  key={field.field}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <code className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-mono whitespace-nowrap">
                    {field.field}
                  </code>
                  <span className="text-sm text-muted-foreground">{field.description}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm font-medium text-info">Dica</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para a tabela de itens, crie uma tabela no Word com as colunas desejadas e use o
                campo <code className="text-info">{'{{tabela_itens}}'}</code> na primeira linha de
                dados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
