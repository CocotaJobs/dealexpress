import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DiscountType = 'percentage' | 'fixed';

interface DiscountTypeToggleProps {
  value: DiscountType;
  onChange: (type: DiscountType) => void;
  disabled?: boolean;
}

export function DiscountTypeToggle({ value, onChange, disabled }: DiscountTypeToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden h-8">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className={cn(
          'rounded-none h-full px-2 text-xs font-medium transition-colors',
          value === 'percentage' 
            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
            : 'hover:bg-muted'
        )}
        onClick={() => onChange('percentage')}
      >
        %
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className={cn(
          'rounded-none h-full px-2 text-xs font-medium transition-colors border-l border-border',
          value === 'fixed' 
            ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
            : 'hover:bg-muted'
        )}
        onClick={() => onChange('fixed')}
      >
        R$
      </Button>
    </div>
  );
}
