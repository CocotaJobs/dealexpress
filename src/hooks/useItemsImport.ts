import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ItemType = Database['public']['Enums']['item_type'];

// Schema for row validation
const importItemSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(100, 'Nome muito longo'),
  tipo: z.enum(['product', 'service']).default('product'),
  categoria: z.string().optional(),
  preco: z.number().min(0, 'Preço deve ser positivo'),
  desconto_max: z.number().min(0).max(100).default(0),
  descricao: z.string().max(200, 'Descrição muito longa').optional(),
  ficha_tecnica: z.string().optional(),
});

export type ImportRow = z.infer<typeof importItemSchema>;

export type ValidatedRow = {
  index: number;
  data: ImportRow;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
};

export function useItemsImport() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Parse a number that could be in BR format (1.234,56) or intl (1,234.56)
  const parseNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const str = String(value).trim();
    
    // Detect format: if contains comma after dot, it's international
    // If contains dot after comma, it's Brazilian
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    let normalized: string;
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.234,56 -> 1234.56
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      // International format: 1,234.56 -> 1234.56
      normalized = str.replace(/,/g, '');
    }
    
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  };

  // Parse item type
  const parseType = (value: unknown): ItemType => {
    const str = String(value || '').toLowerCase().trim();
    if (str === 'service' || str === 'serviço' || str === 'servico') {
      return 'service';
    }
    return 'product';
  };

  // Detect CSV separator
  const detectSeparator = (content: string): string => {
    const firstLine = content.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
  };

  // Parse CSV content
  const parseCSV = (content: string): Record<string, unknown>[] => {
    const separator = detectSeparator(content);
    const lines = content.split('\n').filter((line) => line.trim());
    
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(separator).map((h) => 
      h.trim().toLowerCase().replace(/['"]/g, '')
    );
    
    return lines.slice(1).map((line) => {
      const values = line.split(separator).map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
  };

  // Validate rows
  const validateRows = (rawRows: Record<string, unknown>[]): ValidatedRow[] => {
    return rawRows.slice(0, 500).map((raw, index) => {
      // Map column names (handle variations)
      const mapped: Record<string, unknown> = {
        nome: raw['nome'] || raw['name'] || raw['item'] || '',
        tipo: parseType(raw['tipo'] || raw['type']),
        categoria: raw['categoria'] || raw['category'] || '',
        preco: parseNumber(raw['preco'] || raw['preço'] || raw['price'] || raw['valor']),
        desconto_max: parseNumber(raw['desconto_max'] || raw['desconto'] || raw['discount'] || 0),
        descricao: raw['descricao'] || raw['descrição'] || raw['description'] || '',
        ficha_tecnica: raw['ficha_tecnica'] || raw['ficha'] || raw['specs'] || raw['technical_specs'] || '',
      };

      const result = importItemSchema.safeParse(mapped);
      
      if (result.success) {
        return {
          index: index + 1,
          data: result.data,
          status: 'valid' as const,
          errors: [],
        };
      } else {
        const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        const hasRequiredError = errors.some((e) => 
          e.includes('Nome obrigatório') || e.includes('Preço')
        );
        
        // Try to construct partial data for preview
        const partialData: ImportRow = {
          nome: String(mapped.nome || ''),
          tipo: parseType(mapped.tipo),
          categoria: String(mapped.categoria || ''),
          preco: parseNumber(mapped.preco),
          desconto_max: parseNumber(mapped.desconto_max),
          descricao: String(mapped.descricao || ''),
          ficha_tecnica: String(mapped.ficha_tecnica || ''),
        };
        
        return {
          index: index + 1,
          data: partialData,
          status: hasRequiredError ? 'error' as const : 'warning' as const,
          errors,
        };
      }
    });
  };

  // Parse file
  const parseFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);
    setFileName(file.name);
    
    try {
      let rawRows: Record<string, unknown>[];
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        rawRows = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      } else {
        throw new Error('Formato não suportado. Use .xlsx ou .csv');
      }

      if (rawRows.length === 0) {
        throw new Error('Arquivo vazio ou sem dados válidos');
      }

      if (rawRows.length > 500) {
        toast({
          title: 'Aviso',
          description: `Apenas os primeiros 500 itens serão processados (total: ${rawRows.length})`,
        });
      }

      const validated = validateRows(rawRows);
      setRows(validated);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar arquivo';
      toast({
        title: 'Erro ao processar arquivo',
        description: message,
        variant: 'destructive',
      });
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  }, [toast]);

  // Import valid items
  const importItems = useCallback(async (
    existingCategories: { id: string; name: string }[],
    createCategory: (name: string) => Promise<{ data: { id: string; name: string } | null; error: string | null }>
  ) => {
    const validRows = rows.filter((r) => r.status !== 'error');
    
    if (validRows.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Corrija os erros e tente novamente',
        variant: 'destructive',
      });
      return { success: false, count: 0 };
    }

    setIsLoading(true);
    
    try {
      // Get organization ID
      const { data: orgId, error: orgError } = await supabase.rpc('get_user_organization_id');
      if (orgError) throw orgError;

      // Build category map
      const categoryMap: Record<string, string> = {};
      existingCategories.forEach((cat) => {
        categoryMap[cat.name.toLowerCase()] = cat.id;
      });

      // Create missing categories
      const uniqueCategories = [...new Set(
        validRows
          .map((r) => r.data.categoria?.trim())
          .filter((c): c is string => !!c && !categoryMap[c.toLowerCase()])
      )];

      for (const catName of uniqueCategories) {
        const result = await createCategory(catName);
        if (result.data) {
          categoryMap[catName.toLowerCase()] = result.data.id;
        }
      }

      // Prepare items for insertion
      const itemsToInsert = validRows.map((row) => ({
        name: row.data.nome,
        type: row.data.tipo,
        category_id: row.data.categoria 
          ? categoryMap[row.data.categoria.toLowerCase()] || null 
          : null,
        price: row.data.preco,
        max_discount: row.data.desconto_max,
        description: row.data.descricao || null,
        technical_specs: row.data.ficha_tecnica || null,
        organization_id: orgId,
      }));

      // Insert in batches of 50
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('items').insert(batch);
        if (error) throw error;
        insertedCount += batch.length;
      }

      toast({
        title: 'Importação concluída!',
        description: `${insertedCount} itens foram importados com sucesso.`,
      });

      setRows([]);
      setFileName(null);
      
      return { success: true, count: insertedCount };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar itens';
      toast({
        title: 'Erro na importação',
        description: message,
        variant: 'destructive',
      });
      return { success: false, count: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [rows, toast]);

  // Generate template CSV
  const downloadTemplateCSV = useCallback(() => {
    const headers = ['nome', 'tipo', 'categoria', 'preco', 'desconto_max', 'descricao', 'ficha_tecnica'];
    const exampleRow = ['Produto Exemplo', 'product', 'Categoria A', '199.90', '10', 'Descrição breve', 'Especificações técnicas'];
    
    const csvContent = [
      headers.join(';'),
      exampleRow.join(';'),
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_importacao_itens.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Generate template Excel
  const downloadTemplateExcel = useCallback(() => {
    const headers = ['nome', 'tipo', 'categoria', 'preco', 'desconto_max', 'descricao', 'ficha_tecnica'];
    const exampleRow = ['Produto Exemplo', 'product', 'Categoria A', 199.90, 10, 'Descrição breve', 'Especificações técnicas'];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    XLSX.writeFile(wb, 'modelo_importacao_itens.xlsx');
  }, []);

  // Clear state
  const reset = useCallback(() => {
    setRows([]);
    setFileName(null);
  }, []);

  // Stats
  const stats = {
    total: rows.length,
    valid: rows.filter((r) => r.status === 'valid').length,
    warnings: rows.filter((r) => r.status === 'warning').length,
    errors: rows.filter((r) => r.status === 'error').length,
  };

  return {
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
  };
}
