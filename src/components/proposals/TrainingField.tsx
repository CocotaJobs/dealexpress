import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Props { value: boolean; onChange: (v: boolean) => void }

export function TrainingField({ value, onChange }: Props) {
  const cls = 'h-8 px-4 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';
  return (
    <div className="space-y-2">
      <Label>Treinamento técnico</Label>
      <ToggleGroup type="single" value={value ? 'sim' : 'nao'} onValueChange={(v) => v && onChange(v === 'sim')} className="justify-start">
        <ToggleGroupItem value="sim" aria-label="Sim" className={cls}>Sim</ToggleGroupItem>
        <ToggleGroupItem value="nao" aria-label="Não" className={cls}>Não</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
