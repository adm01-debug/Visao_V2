/**
 * VISÃO - Sistema de Vigilância Inteligente
 * RuleBuilder Component
 */

import { memo, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Save,
  AlertTriangle,
  Clock,
  Camera,
  Users,
  Car,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type ConditionType = 
  | 'people_count' 
  | 'face_recognition' 
  | 'vehicle_detection' 
  | 'motion_detection'
  | 'loitering'
  | 'restricted_area';

export type ActionType = 'alert' | 'notify' | 'record' | 'lockdown';
export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RuleCondition {
  id: string;
  type: ConditionType;
  operator: 'greater_than' | 'less_than' | 'equals' | 'contains';
  value: string | number;
}

export interface RuleAction {
  id: string;
  type: ActionType;
  params?: Record<string, unknown>;
}

export interface RuleData {
  name: string;
  description?: string;
  isActive: boolean;
  severity: RuleSeverity;
  conditions: RuleCondition[];
  actions: ActionType[];
  cameras: string[];
}

interface RuleBuilderProps {
  onSave: (rule: RuleData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<RuleData>;
  availableCameras?: { id: string; name: string }[];
  isLoading?: boolean;
  className?: string;
}

const conditionIcons: Record<ConditionType, typeof Users> = {
  people_count: Users,
  face_recognition: ShieldAlert,
  vehicle_detection: Car,
  motion_detection: AlertTriangle,
  loitering: Clock,
  restricted_area: ShieldAlert,
};

const conditionLabels: Record<ConditionType, string> = {
  people_count: 'Contagem de Pessoas',
  face_recognition: 'Reconhecimento Facial',
  vehicle_detection: 'Detecção de Veículos',
  motion_detection: 'Detecção de Movimento',
  loitering: 'Permanência Prolongada',
  restricted_area: 'Área Restrita',
};

function RuleBuilderComponent({
  onSave,
  onCancel,
  initialData,
  availableCameras = [],
  isLoading = false,
  className
}: RuleBuilderProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [severity, setSeverity] = useState<RuleSeverity>(initialData?.severity || 'medium');
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialData?.conditions || []
  );
  const [actions, setActions] = useState<ActionType[]>(
    initialData?.actions || ['alert']
  );
  const [selectedCameras, setSelectedCameras] = useState<string[]>(
    initialData?.cameras || []
  );
  const [error, setError] = useState<string | null>(null);

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: crypto.randomUUID(),
      type: 'people_count',
      operator: 'greater_than',
      value: 0,
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleAction = (action: ActionType) => {
    if (actions.includes(action)) {
      setActions(actions.filter(a => a !== action));
    } else {
      setActions([...actions, action]);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    
    if (conditions.length === 0) {
      setError('Adicione pelo menos uma condição');
      return;
    }

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      isActive,
      severity,
      conditions,
      actions,
      cameras: selectedCameras,
    });
  };

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {initialData ? 'Editar Regra' : 'Nova Regra'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Regra Ativa</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alerta de Intrusão"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito desta regra"
              rows={2}
            />
          </div>

          <div>
            <Label>Severidade</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as RuleSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Conditions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Condições</Label>
            <Button variant="outline" size="sm" onClick={addCondition} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>

          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma condição definida</p>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition) => {
                const Icon = conditionIcons[condition.type];
                return (
                  <div key={condition.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Icon className="w-5 h-5 text-primary" />
                    <Select 
                      value={condition.type} 
                      onValueChange={(v) => updateCondition(condition.id, { type: v as ConditionType })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(conditionLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={condition.operator}
                      onValueChange={(v) => updateCondition(condition.id, { operator: v as RuleCondition['operator'] })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greater_than">Maior que</SelectItem>
                        <SelectItem value="less_than">Menor que</SelectItem>
                        <SelectItem value="equals">Igual a</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: Number(e.target.value) })}
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(condition.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-4">
          <Label>Ações</Label>
          <div className="flex flex-wrap gap-2">
            {(['alert', 'notify', 'record', 'lockdown'] as ActionType[]).map((action) => (
              <Badge
                key={action}
                variant={actions.includes(action) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleAction(action)}
              >
                {action === 'alert' && 'Gerar Alerta'}
                {action === 'notify' && 'Notificar'}
                {action === 'record' && 'Gravar'}
                {action === 'lockdown' && 'Bloquear'}
              </Badge>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? 'Salvando...' : 'Salvar Regra'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const RuleBuilder = memo(RuleBuilderComponent);
