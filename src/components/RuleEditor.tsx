import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UIRule, RuleCondition, RuleCategory, RuleSeverity, RuleActionType, RuleConditionType } from '@/types/rules';
import { conditionTypeLabels } from '@/data/mockRules';
import { mockCameras } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RuleEditorProps {
  rule?: UIRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Omit<UIRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const categories: { value: RuleCategory; label: string }[] = [
  { value: 'security', label: 'Segurança' },
  { value: 'safety', label: 'Segurança do Trabalho' },
  { value: 'operations', label: 'Operações' },
  { value: 'access', label: 'Acesso' },
  { value: 'analytics', label: 'Analytics' },
];

const severities: { value: RuleSeverity; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

const actions: { value: RuleActionType; label: string }[] = [
  { value: 'alert', label: 'Gerar Alerta' },
  { value: 'notification', label: 'Enviar Notificação' },
  { value: 'record', label: 'Gravar Vídeo' },
  { value: 'alarm', label: 'Disparar Alarme' },
];

const conditionTypes = Object.entries(conditionTypeLabels).map(([value, info]) => ({
  value: value as RuleConditionType,
  label: info.label,
  description: info.description,
}));

const operators = [
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'equals', label: 'Igual a' },
  { value: 'between', label: 'Entre' },
];

const weekDays = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const defaultRule = {
  name: '',
  description: '',
  category: 'security' as RuleCategory,
  severity: 'medium' as RuleSeverity,
  conditions: [] as RuleCondition[],
  actions: ['alert'] as RuleActionType[],
  cameras: [] as string[],
  schedule: {
    enabled: false,
    startTime: '08:00',
    endTime: '18:00',
    days: [1, 2, 3, 4, 5],
  },
  isActive: true,
};

export function RuleEditor({ rule, isOpen, onClose, onSave }: RuleEditorProps) {
  const [formData, setFormData] = useState(defaultRule);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        conditions: [...rule.conditions],
        actions: [...rule.actions],
        cameras: [...rule.cameras],
        schedule: { 
          enabled: rule.schedule.enabled,
          startTime: rule.schedule.startTime || '08:00',
          endTime: rule.schedule.endTime || '18:00',
          days: rule.schedule.days || [1, 2, 3, 4, 5],
        },
        isActive: rule.isActive,
      });
    } else {
      setFormData(defaultRule);
    }
  }, [rule, isOpen]);

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { type: 'people_count' as RuleConditionType, operator: 'greater_than' as const, value: 1 },
      ],
    }));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => 
        i === index ? { ...c, ...updates } : c
      ),
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const toggleAction = (action: RuleActionType) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.includes(action)
        ? prev.actions.filter(a => a !== action)
        : [...prev.actions, action],
    }));
  };

  const toggleCamera = (cameraId: string) => {
    setFormData(prev => ({
      ...prev,
      cameras: prev.cameras.includes(cameraId)
        ? prev.cameras.filter(c => c !== cameraId)
        : [...prev.cameras, cameraId],
    }));
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days?.includes(day)
          ? prev.schedule.days.filter(d => d !== day)
          : [...(prev.schedule.days || []), day],
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {rule ? 'Editar Regra' : 'Nova Regra'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome da Regra</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Aglomeração na Produção"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: RuleCategory) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Severidade</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: RuleSeverity) => setFormData(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map(sev => (
                      <SelectItem key={sev.value} value={sev.value}>{sev.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o comportamento que esta regra detecta..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Condições</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {formData.conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 bg-secondary/20 rounded-lg">
                Nenhuma condição definida. Adicione pelo menos uma condição.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.conditions.map((condition, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Select
                        value={condition.type}
                        onValueChange={(value: RuleConditionType) => updateCondition(index, { type: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {conditionTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value: RuleCondition['operator']) => updateCondition(index, { operator: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
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
                          onChange={e => updateCondition(index, { value: Number(e.target.value) })}
                          className="text-sm"
                          min={0}
                        />
                        {condition.operator === 'between' && (
                          <Input
                            type="number"
                            value={condition.value2 || 0}
                            onChange={e => updateCondition(index, { value2: Number(e.target.value) })}
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
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Label className="text-base">Ações</Label>
            <div className="flex flex-wrap gap-2">
              {actions.map(action => (
                <Button
                  key={action.value}
                  type="button"
                  variant={formData.actions.includes(action.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleAction(action.value)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Cameras */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Câmeras</Label>
              <span className="text-xs text-muted-foreground">
                {formData.cameras.length === 0 ? 'Todas as câmeras' : `${formData.cameras.length} selecionadas`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-secondary/20 rounded-lg">
              {mockCameras.map(camera => (
                <label
                  key={camera.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer"
                >
                  <Checkbox
                    checked={formData.cameras.includes(camera.id)}
                    onCheckedChange={() => toggleCamera(camera.id)}
                  />
                  <span className="text-sm truncate">{camera.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Agendamento</Label>
              <Switch
                checked={formData.schedule.enabled}
                onCheckedChange={(enabled) => 
                  setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, enabled } }))
                }
              />
            </div>

            {formData.schedule.enabled && (
              <div className="space-y-3 p-3 bg-secondary/20 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Início</Label>
                    <Input
                      type="time"
                      value={formData.schedule.startTime}
                      onChange={e => 
                        setFormData(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, startTime: e.target.value } 
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Fim</Label>
                    <Input
                      type="time"
                      value={formData.schedule.endTime}
                      onChange={e => 
                        setFormData(prev => ({ 
                          ...prev, 
                          schedule: { ...prev.schedule, endTime: e.target.value } 
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Dias da Semana</Label>
                  <div className="flex gap-1">
                    {weekDays.map(day => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={formData.schedule.days?.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 px-1"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div>
              <Label className="text-base">Regra Ativa</Label>
              <p className="text-sm text-muted-foreground">Esta regra será aplicada imediatamente</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(isActive) => setFormData(prev => ({ ...prev, isActive }))}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {rule ? 'Salvar Alterações' : 'Criar Regra'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
