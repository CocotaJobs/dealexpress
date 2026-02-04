import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Truck } from 'lucide-react';

interface ShippingFieldProps {
  defaultShipping: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ShippingField({ defaultShipping, value, onChange }: ShippingFieldProps) {
  const [mode, setMode] = useState<'default' | 'custom'>(value ? 'custom' : 'default');
  const [customValue, setCustomValue] = useState(value || '');

  useEffect(() => {
    if (value) {
      setMode('custom');
      setCustomValue(value);
    } else {
      setMode('default');
      setCustomValue('');
    }
  }, [value]);

  const handleModeChange = (newMode: 'default' | 'custom') => {
    setMode(newMode);
    if (newMode === 'default') {
      onChange(null);
      setCustomValue('');
    }
  };

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue);
    onChange(newValue || null);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-muted-foreground" />
        Frete
      </Label>
      <RadioGroup
        value={mode}
        onValueChange={(v) => handleModeChange(v as 'default' | 'custom')}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="default" id="shipping-default" />
          <Label htmlFor="shipping-default" className="font-normal cursor-pointer">
            Usar padrão: <span className="text-muted-foreground">"{defaultShipping}"</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="custom" id="shipping-custom" />
          <Label htmlFor="shipping-custom" className="font-normal cursor-pointer">
            Personalizado
          </Label>
        </div>
      </RadioGroup>
      {mode === 'custom' && (
        <Input
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Ex: Grátis, R$ 150,00, CIF, FOB..."
          className="mt-2"
        />
      )}
    </div>
  );
}
