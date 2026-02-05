import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Building2, User } from 'lucide-react';

export type DocumentType = 'cpf' | 'cnpj';

interface DocumentTypeFieldProps {
  value: string;
  onChange: (value: string) => void;
  documentType: DocumentType;
  onDocumentTypeChange: (type: DocumentType) => void;
}

// Format CPF: 000.000.000-00
const formatCpf = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
};

// Format CNPJ: 00.000.000/0000-00
const formatCnpj = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
};

export function DocumentTypeField({ 
  value, 
  onChange, 
  documentType, 
  onDocumentTypeChange 
}: DocumentTypeFieldProps) {
  const handleValueChange = (inputValue: string) => {
    const formatted = documentType === 'cpf' 
      ? formatCpf(inputValue) 
      : formatCnpj(inputValue);
    onChange(formatted);
  };

  const handleTypeChange = (newType: string) => {
    if (newType === 'cpf' || newType === 'cnpj') {
      onDocumentTypeChange(newType);
      // Clear value when switching types to avoid confusion
      onChange('');
    }
  };

  const placeholder = documentType === 'cpf' 
    ? '000.000.000-00' 
    : '00.000.000/0000-00';

  const label = documentType === 'cpf' ? 'CPF' : 'CNPJ';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="clientDocument">{label}</Label>
        <ToggleGroup 
          type="single" 
          value={documentType} 
          onValueChange={handleTypeChange}
          className="h-7"
        >
          <ToggleGroupItem 
            value="cpf" 
            aria-label="CPF" 
            className="h-7 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <User className="w-3 h-3 mr-1" />
            CPF
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="cnpj" 
            aria-label="CNPJ"
            className="h-7 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Building2 className="w-3 h-3 mr-1" />
            CNPJ
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="relative">
        {documentType === 'cpf' ? (
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        ) : (
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          id="clientDocument"
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
    </div>
  );
}
