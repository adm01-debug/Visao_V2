/**
 * VISÃO - Rule Form Dialog
 */
import { Plus, Save, X, Camera, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { CATEGORIES, SEVERITIES, CONDITION_TYPES, ACTIONS, DAYS_OF_WEEK, type RuleFormData } from './constants';

interface RuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: RuleFormData;
  setFormData: React.Dispatch<React.SetStateAction<RuleFormData>>;
  isEditing: boolean;
  onSave: () => void;
  cameras: Array<{ id: string; name: string }>;
}

export function RuleFormDialog({ open, onOpenChange, formData, setFormData, isEditing, onSave, cameras }: RuleFormDialogProps) {
  const addCondition = () => {
    setFormData(prev => ({ ...prev, conditions: [...prev.conditions, { type: 'motion_detection', operator: 'equals', value: 'true' }] }));
  };
  const removeCondition = (index: number) => {
    setFormData(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }));
  };
  const updateCondition = (index: number, field: string, value: string) => {
    setFormData(prev => ({ ...prev, conditions: prev.conditions.map((c, i) => i === index ? { ...c, [field]: value } : c) }));
  };
  const toggleAction = (action: string) => {
    setFormData(prev => ({ ...prev, actions: prev.actions.includes(action) ? prev.actions.filter(a => a !== action) : [...prev.actions, action] }));
  };
  const toggleCamera = (cameraId: string) => {
    setFormData(prev => ({ ...prev, cameras: prev.cameras.includes(cameraId) ? prev.cameras.filter(c => c !== cameraId) : [...prev.cameras, cameraId] }));
  };
  const toggleDay = (day: number) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, days: prev.schedule.days.includes(day) ? prev.schedule.days.filter(d => d !== day) : [...prev.schedule.days, day].sort() } }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Regra' : 'Nova Regra de Automação'}</DialogTitle>
          <DialogDescription>Configure as condições e ações para esta regra</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Regra</Label>
                  <Input placeholder="Ex: Alerta de Movimento Noturno" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2"><cat.icon className="h-4 w-4" />{cat.label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea placeholder="Descreva o propósito desta regra..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Severidade Mínima</Label>
                <div className="flex gap-2">
                  {SEVERITIES.map(sev => (
                    <Button key={sev.value} variant={formData.severity === sev.value ? 'default' : 'outline'} size="sm" onClick={() => setFormData(prev => ({ ...prev, severity: sev.value }))} className="flex-1">
                      <div className={cn('w-2 h-2 rounded-full mr-2', sev.color)} />{sev.label}
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
                <Button variant="outline" size="sm" onClick={addCondition}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
              </div>
              {formData.conditions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  Nenhuma condição. A regra será acionada para todos os alertas da severidade selecionada.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <Select value={condition.type} onValueChange={(value) => updateCondition(index, 'type', value)}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{CONDITION_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeCondition(index)}><X className="h-4 w-4" /></Button>
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
                  <div key={action.value} className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors', formData.actions.includes(action.value) ? 'border-primary bg-primary/5' : 'hover:bg-muted')} onClick={() => toggleAction(action.value)}>
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

            {/* Cameras & Schedule */}
            <Accordion type="single" collapsible>
              <AccordionItem value="cameras">
                <AccordionTrigger><div className="flex items-center gap-2"><Camera className="h-4 w-4" />Câmeras ({formData.cameras.length === 0 ? 'Todas' : formData.cameras.length})</div></AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {cameras.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma câmera disponível</p> : (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">{formData.cameras.length === 0 ? 'Aplica a todas as câmeras. Selecione para restringir:' : 'Selecionadas:'}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {cameras.map(camera => (
                            <div key={camera.id} className={cn('flex items-center gap-2 p-2 rounded border cursor-pointer', formData.cameras.includes(camera.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted')} onClick={() => toggleCamera(camera.id)}>
                              <Checkbox checked={formData.cameras.includes(camera.id)} /><span className="text-sm">{camera.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="schedule">
                <AccordionTrigger><div className="flex items-center gap-2"><Clock className="h-4 w-4" />Agendamento ({formData.schedule.enabled ? 'Ativo' : 'Sempre'})</div></AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.schedule.enabled} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, enabled: checked } }))} />
                      <Label>Restringir horário de funcionamento</Label>
                    </div>
                    {formData.schedule.enabled && (
                      <>
                        <div className="flex gap-2">
                          {DAYS_OF_WEEK.map(day => (
                            <Button key={day.value} variant={formData.schedule.days.includes(day.value) ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => toggleDay(day.value)}>{day.label}</Button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Horário Início</Label>
                            <Input type="time" value={formData.schedule.start_time} onChange={(e) => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, start_time: e.target.value } }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Horário Fim</Label>
                            <Input type="time" value={formData.schedule.end_time} onChange={(e) => setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, end_time: e.target.value } }))} />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={!formData.name || formData.actions.length === 0}>
            <Save className="h-4 w-4 mr-2" />{isEditing ? 'Salvar Alterações' : 'Criar Regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
