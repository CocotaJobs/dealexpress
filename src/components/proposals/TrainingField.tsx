import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props { value: string; onChange: (v: string) => void }

export function TrainingField({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="technicalTraining">Treinamento técnico</Label>
      <Textarea
        id="technicalTraining"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        placeholder="Ex.: Treinamento presencial de 4 horas incluso"
        rows={3}
      />
    </div>
  );
}
