/**
 * VISÃO - Rule Editor (Refactored)
 */
import { useEffect, useState } from 'react';
import { UIRule, RuleCondition, RuleConditionType, RuleActionType } from '@/types/rules';
import { mockCameras } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConditionsSection } from './rule-editor/ConditionsSection';
import { ScheduleSection } from './rule-editor/ScheduleSection';
import {
  categories, severities, actions as actionOptions,
  defaultRule, type RuleEditorFormData,
} from './rule-editor/RuleEditorConstants';
import type { RuleCategory, RuleSeverity } from '@/types/rules';

interface RuleEditorProps {
  rule?: UIRule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Omit<UIRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function RuleEditor({ rule, isOpen, onClose, onSave }: RuleEditorProps) {
  const [formData, setFormData] = useState<RuleEditorFormData>(defaultRule);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name, description: rule.description, category: rule.category,
        severity: rule.severity, conditions: [...rule.conditions], actions: [...rule.actions],
        cameras: [...rule.cameras],
        schedule: {
          enabled: rule.schedule.enabled, startTime: rule.schedule.startTime || '08:00',
          endTime: rule.schedule.endTime || '18:00', days: rule.schedule.days || [1, 2, 3, 4, 5],
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
      conditions: [...prev.conditions, { type: 'people_count' as RuleConditionType, operator: 'greater_than' as const, value: 1 }],
    }));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setFormData(prev => ({
      ...prev, conditions: prev.conditions.map((c, i) => i === index ? { ...c, ...updates } : c),
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }));
  };

  const toggleAction = (action: RuleActionType) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.includes(action) ? prev.actions.filter(a => a !== action) : [...prev.actions, action],
    }));
  };

  const toggleCamera = (cameraId: string) => {
    setFormData(prev => ({
      ...prev,
      cameras: prev.cameras.includes(cameraId) ? prev.cameras.filter(c => c !== cameraId) : [...prev.cameras, cameraId],
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
          <DialogTitle className="text-xl font-bold">{rule ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome da Regra</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Aglomeração na Produção" required />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(v: RuleCategory) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="severity">Severidade</Label>
                <Select value={formData.severity} onValueChange={(v: RuleSeverity) => setFormData(prev => ({ ...prev, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{severities.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Descreva o comportamento que esta regra detecta..." rows={2} />
              </div>
            </div>
          </div>

          <ConditionsSection conditions={formData.conditions} onAdd={addCondition} onUpdate={updateCondition} onRemove={removeCondition} />

          {/* Actions */}
          <div className="space-y-3">
            <Label className="text-base">Ações</Label>
            <div className="flex flex-wrap gap-2">
              {actionOptions.map(action => (
                <Button key={action.value} type="button" variant={formData.actions.includes(action.value) ? 'default' : 'outline'} size="sm" onClick={() => toggleAction(action.value)}>{action.label}</Button>
              ))}
            </div>
          </div>

          {/* Cameras */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Câmeras</Label>
              <span className="text-xs text-muted-foreground">{formData.cameras.length === 0 ? 'Todas as câmeras' : `${formData.cameras.length} selecionadas`}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-secondary/20 rounded-lg">
              {mockCameras.map(camera => (
                <label key={camera.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/30 cursor-pointer">
                  <Checkbox checked={formData.cameras.includes(camera.id)} onCheckedChange={() => toggleCamera(camera.id)} />
                  <span className="text-sm truncate">{camera.name}</span>
                </label>
              ))}
            </div>
          </div>

          <ScheduleSection schedule={formData.schedule} onChange={schedule => setFormData(prev => ({ ...prev, schedule }))} />

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div>
              <Label className="text-base">Regra Ativa</Label>
              <p className="text-sm text-muted-foreground">Esta regra será aplicada imediatamente</p>
            </div>
            <Switch checked={formData.isActive} onCheckedChange={isActive => setFormData(prev => ({ ...prev, isActive }))} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">{rule ? 'Salvar Alterações' : 'Criar Regra'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
