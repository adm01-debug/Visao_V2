/**
 * Automation Rules Manager Component
 * Allows creating, editing and managing automation rules
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Power, 
  PowerOff,
  Zap,
  Clock,
  Camera,
  Bell,
  Shield,
  AlertTriangle,
  Play,
  Pause,
  Settings2,
  ChevronRight,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRules, type Rule, type RuleCondition } from '@/hooks/useRules';
import { useCameras } from '@/hooks/useCameras';
import { cn } from '@/lib/utils';
import { RuleTemplateSelector } from './RuleTemplateSelector';
import { RuleTemplate } from '@/data/ruleTemplates';

const CATEGORIES = [
  { value: 'security', label: 'Segurança', icon: Shield },
  { value: 'safety', label: 'Segurança do Trabalho', icon: AlertTriangle },
  { value: 'operations', label: 'Operações', icon: Settings2 },
  { value: 'access', label: 'Controle de Acesso', icon: Camera },
  { value: 'analytics', label: 'Analytics', icon: Zap },
];

const SEVERITIES = [
  { value: 'low', label: 'Baixa', color: 'bg-blue-500' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'critical', label: 'Crítica', color: 'bg-red-500' },
];

const CONDITION_TYPES = [
  { value: 'people_count', label: 'Contagem de Pessoas' },
  { value: 'no_ppe', label: 'Ausência de EPI' },
  { value: 'restricted_area', label: 'Área Restrita' },
  { value: 'face_recognition', label: 'Reconhecimento Facial' },
  { value: 'vehicle_detection', label: 'Detecção de Veículo' },
  { value: 'loitering', label: 'Permanência Prolongada' },
  { value: 'crowd_density', label: 'Densidade de Multidão' },
  { value: 'motion_detection', label: 'Detecção de Movimento' },
  { value: 'object_left', label: 'Objeto Abandonado' },
  { value: 'perimeter_breach', label: 'Violação de Perímetro' },
];

const ACTIONS = [
  { value: 'alert', label: 'Criar Alerta', description: 'Registra um alerta no sistema' },
  { value: 'notify', label: 'Enviar Notificação', description: 'Notifica via canais configurados' },
  { value: 'record', label: 'Iniciar Gravação', description: 'Começa a gravar a câmera' },
  { value: 'lockdown', label: 'Modo Lockdown', description: 'Ativa modo de emergência' },
  { value: 'dispatch', label: 'Despachar Segurança', description: 'Notifica equipe de segurança' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

interface RuleFormData {
  name: string;
  description: string;
  category: string;
  severity: string;
  conditions: RuleCondition[];
  actions: string[];
  cameras: string[];
  schedule: {
    enabled: boolean;
    days: number[];
    start_time: string;
    end_time: string;
  };
  is_active: boolean;
}

const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  category: 'security',
  severity: 'medium',
  conditions: [],
  actions: ['alert'],
  cameras: [],
  schedule: {
    enabled: false,
    days: [1, 2, 3, 4, 5],
    start_time: '08:00',
    end_time: '18:00',
  },
  is_active: true,
};

export function AutomationRulesManager() {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleActive } = useRules();
  const { cameras } = useCameras();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleSelectTemplate = (template: RuleTemplate) => {
    setEditingRule(null);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      severity: template.severity,
      conditions: template.conditions.map(c => ({
        type: c.type,
        operator: c.operator,
        value: String(c.value)
      })),
      actions: template.actions,
      cameras: [],
      schedule: {
        enabled: false,
        days: [1, 2, 3, 4, 5],
        start_time: '08:00',
        end_time: '18:00',
      },
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: Rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      category: rule.category,
      severity: rule.severity,
      conditions: rule.conditions,
      actions: rule.actions,
      cameras: rule.cameras,
      schedule: rule.schedule || {
        enabled: false,
        days: [1, 2, 3, 4, 5],
        start_time: '08:00',
        end_time: '18:00',
      },
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingRule) {
        await updateRule({
          id: editingRule.id,
          name: formData.name,
          description: formData.description || null,
          category: formData.category as 'security' | 'safety' | 'operations' | 'access' | 'analytics',
          severity: formData.severity as 'low' | 'medium' | 'high' | 'critical',
          conditions: formData.conditions as unknown as Record<string, unknown>,
          actions: formData.actions as ('alert' | 'notify' | 'record' | 'lockdown' | 'dispatch')[],
          cameras: formData.cameras,
          schedule: formData.schedule.enabled ? formData.schedule as unknown as Record<string, unknown> : null,
          is_active: formData.is_active,
        });
      } else {
        await createRule({
          name: formData.name,
          description: formData.description || null,
          category: formData.category as 'security' | 'safety' | 'operations' | 'access' | 'analytics',
          severity: formData.severity as 'low' | 'medium' | 'high' | 'critical',
          conditions: formData.conditions as unknown as Record<string, unknown>,
          actions: formData.actions as ('alert' | 'notify' | 'record' | 'lockdown' | 'dispatch')[],
          cameras: formData.cameras,
          schedule: formData.schedule.enabled ? formData.schedule as unknown as Record<string, unknown> : null,
          is_active: formData.is_active,
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRule(id);
    setDeleteConfirmId(null);
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { type: 'motion_detection', operator: 'equals', value: 'true' }],
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (index: number, field: keyof RuleCondition, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const toggleAction = (action: string) => {
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
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter(d => d !== day)
          : [...prev.schedule.days, day].sort(),
      },
    }));
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || Zap;
  };

  const getSeverityColor = (severity: string) => {
    return SEVERITIES.find(s => s.value === severity)?.color || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Regras de Automação
          </h2>
          <p className="text-muted-foreground">
            Configure ações automáticas baseadas em condições de alertas
          </p>
        </div>
        <div className="flex gap-2">
          <RuleTemplateSelector onSelectTemplate={handleSelectTemplate} />
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma regra configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie regras de automação para executar ações automáticas quando alertas forem detectados.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {rules.map((rule) => {
              const CategoryIcon = getCategoryIcon(rule.category);
              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className={cn(
                    'transition-all',
                    !rule.is_active && 'opacity-60'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'p-2 rounded-lg',
                            rule.is_active ? 'bg-primary/10' : 'bg-muted'
                          )}>
                            <CategoryIcon className={cn(
                              'h-5 w-5',
                              rule.is_active ? 'text-primary' : 'text-muted-foreground'
                            )} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{rule.name}</h3>
                              <Badge variant="outline" className={cn(
                                'text-xs',
                                getSeverityColor(rule.severity),
                                'bg-opacity-20 border-0'
                              )}>
                                {SEVERITIES.find(s => s.value === rule.severity)?.label}
                              </Badge>
                              {!rule.is_active && (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground">
                                {rule.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{rule.conditions.length} condição(ões)</span>
                              <span>•</span>
                              <span>{rule.actions.length} ação(ões)</span>
                              {rule.cameras.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{rule.cameras.length} câmera(s)</span>
                                </>
                              )}
                              {rule.schedule && (
                                <>
                                  <span>•</span>
                                  <Clock className="h-3 w-3" />
                                  <span>Agendado</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleActive(rule.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}
            </DialogTitle>
            <DialogDescription>
              Configure as condições e ações para esta regra
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Regra</Label>
                    <Input
                      placeholder="Ex: Alerta de Movimento Noturno"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    placeholder="Descreva o propósito desta regra..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Severidade Mínima</Label>
                  <div className="flex gap-2">
                    {SEVERITIES.map(sev => (
                      <Button
                        key={sev.value}
                        variant={formData.severity === sev.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, severity: sev.value }))}
                        className="flex-1"
                      >
                        <div className={cn('w-2 h-2 rounded-full mr-2', sev.color)} />
                        {sev.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Condições</Label>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                
                {formData.conditions.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    Nenhuma condição. A regra será acionada para todos os alertas da severidade selecionada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Select
                          value={condition.type}
                          onValueChange={(value) => updateCondition(index, 'type', value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeCondition(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-4">
                <Label className="text-base">Ações a Executar</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ACTIONS.map(action => (
                    <div
                      key={action.value}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        formData.actions.includes(action.value)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => toggleAction(action.value)}
                    >
                      <Checkbox checked={formData.actions.includes(action.value)} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Cameras */}
              <Accordion type="single" collapsible>
                <AccordionItem value="cameras">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Câmeras ({formData.cameras.length === 0 ? 'Todas' : formData.cameras.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {cameras.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma câmera disponível</p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-2">
                            {formData.cameras.length === 0 
                              ? 'Aplica a todas as câmeras. Selecione para restringir:'
                              : 'Selecionadas:'
                            }
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {cameras.map(camera => (
                              <div
                                key={camera.id}
                                className={cn(
                                  'flex items-center gap-2 p-2 rounded border cursor-pointer',
                                  formData.cameras.includes(camera.id)
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted'
                                )}
                                onClick={() => toggleCamera(camera.id)}
                              >
                                <Checkbox checked={formData.cameras.includes(camera.id)} />
                                <span className="text-sm">{camera.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="schedule">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Agendamento ({formData.schedule.enabled ? 'Ativo' : 'Sempre'})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.schedule.enabled}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({
                              ...prev,
                              schedule: { ...prev.schedule, enabled: checked }
                            }))
                          }
                        />
                        <Label>Restringir horário de funcionamento</Label>
                      </div>

                      {formData.schedule.enabled && (
                        <>
                          <div className="flex gap-2">
                            {DAYS_OF_WEEK.map(day => (
                              <Button
                                key={day.value}
                                variant={formData.schedule.days.includes(day.value) ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1"
                                onClick={() => toggleDay(day.value)}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Horário Início</Label>
                              <Input
                                type="time"
                                value={formData.schedule.start_time}
                                onChange={(e) => 
                                  setFormData(prev => ({
                                    ...prev,
                                    schedule: { ...prev.schedule, start_time: e.target.value }
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Horário Fim</Label>
                              <Input
                                type="time"
                                value={formData.schedule.end_time}
                                onChange={(e) => 
                                  setFormData(prev => ({
                                    ...prev,
                                    schedule: { ...prev.schedule, end_time: e.target.value }
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || formData.actions.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Regra</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AutomationRulesManager;
