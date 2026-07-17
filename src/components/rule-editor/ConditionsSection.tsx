/**
 * VISÃO - Rule Conditions Section
 */
import { Plus, Trash2 } from 'lucide-react';
import { RuleCondition, RuleConditionType } from '@/types/rules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { conditionTypes, operators } from './RuleEditorConstants';

interface ConditionsSectionProps {
  conditions: RuleCondition[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<RuleCondition>) => void;
  onRemove: (index: number) => void;
}

export function ConditionsSection({ conditions, onAdd, onUpdate, onRemove }: ConditionsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Condições</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {conditions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 bg-secondary/20 rounded-lg">
          Nenhuma condição definida. Adicione pelo menos uma condição.
        </p>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <Select
                  value={condition.type}
                  onValueChange={(value: RuleConditionType) => onUpdate(index, { type: value })}
                >
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {conditionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(value: RuleCondition['operator']) => onUpdate(index, { operator: value })}
                >
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={condition.value}
                    onChange={e => onUpdate(index, { value: Number(e.target.value) })}
                    className="text-sm"
                    min={0}
                  />
                  {condition.operator === 'between' && (
                    <Input
                      type="number"
                      value={condition.value2 || 0}
                      onChange={e => onUpdate(index, { value2: Number(e.target.value) })}
                      className="text-sm"
                      min={0}
                    />
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() = aria-label="Excluir"> onRemove(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
