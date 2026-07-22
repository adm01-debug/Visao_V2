/**
 * VISÃO - Automation Rules Manager
 * Refactored: logic in constants.ts, UI in RuleCard + RuleFormDialog
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Plus, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useRules } from '@/hooks/useRules';
import { DbRule } from '@/types/rules';
import type { Json } from '@/integrations/supabase/types';
import { useCameras } from '@/hooks/useCameras';
import { RuleTemplateSelector } from './RuleTemplateSelector';
import { RuleTemplate } from '@/data/ruleTemplates';
import { RuleCard } from './automation/RuleCard';
import { RuleFormDialog } from './automation/RuleFormDialog';
import { defaultFormData, type RuleFormData } from './automation/constants';

export function AutomationRulesManager() {
  const { rules, loading: isLoading, createRule, updateRule, deleteRule, toggleRule } = useRules();
  const { cameras } = useCameras();

  const { data: zones = [] } = useQuery({
    queryKey: ['automation-zones'],
    queryFn: async () => {
      const { data } = await supabase
        .from('zones')
        .select('id, name, camera_id, type, is_active')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    staleTime: 30_000,
  });

  const zoneNameById = new Map(zones.map(z => [z.id, z.name]));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DbRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openCreateDialog = () => { setEditingRule(null); setFormData(defaultFormData); setIsDialogOpen(true); };

  const handleSelectTemplate = (template: RuleTemplate) => {
    setEditingRule(null);
    setFormData({
      name: template.name, description: template.description, category: template.category, severity: template.severity,
      conditions: template.conditions.map(c => ({ type: c.type, operator: c.operator, value: String(c.value) })),
      actions: template.actions, cameras: [], zone_id: null, schedule: { enabled: false, days: [1,2,3,4,5], start_time: '08:00', end_time: '18:00' }, is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: DbRule) => {
    setEditingRule(rule);
    const conditions = Array.isArray(rule.conditions) ? (rule.conditions as unknown as Array<{ type: string; operator: string; value: string }>) : [];
    const schedule = rule.schedule as unknown as { enabled: boolean; days: number[]; start_time: string; end_time: string } | null;
    setFormData({
      name: rule.name, description: rule.description || '', category: rule.category, severity: rule.severity,
      conditions, actions: rule.actions, cameras: rule.cameras,
      zone_id: (rule as unknown as { zone_id?: string | null }).zone_id ?? null,
      schedule: schedule || { enabled: false, days: [1,2,3,4,5], start_time: '08:00', end_time: '18:00' },
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name, description: formData.description || null,
        category: formData.category as 'security' | 'safety' | 'operations' | 'access' | 'analytics',
        severity: formData.severity as 'low' | 'medium' | 'high' | 'critical',
        conditions: formData.conditions as unknown as Json,
        actions: formData.actions as ('alert' | 'notify' | 'record' | 'lockdown' | 'dispatch' | 'arm' | 'disarm' | 'panic')[],
        cameras: formData.cameras,
        schedule: formData.schedule.enabled ? (formData.schedule as unknown as Json) : null,
        is_active: formData.is_active,
      };
      if (editingRule) { await updateRule(editingRule.id, payload); } else { await createRule(payload); }
      setIsDialogOpen(false);
    } catch { /* error handled by hook */ }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary" />Regras de Automação</h2>
          <p className="text-muted-foreground">Configure ações automáticas baseadas em condições de alertas</p>
        </div>
        <div className="flex gap-2">
          <RuleTemplateSelector onSelectTemplate={handleSelectTemplate} />
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Nova Regra</Button>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma regra configurada</h3>
            <p className="text-muted-foreground text-center mb-4">Crie regras de automação para executar ações automáticas quando alertas forem detectados.</p>
            <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Criar Primeira Regra</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} onEdit={openEditDialog} onToggle={toggleRule} onDelete={(id) => setDeleteConfirmId(id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Dialog */}
      <RuleFormDialog
        open={isDialogOpen} onOpenChange={setIsDialogOpen}
        formData={formData} setFormData={setFormData}
        isEditing={!!editingRule} onSave={handleSave} cameras={cameras}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Regra</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteRule(deleteConfirmId).then(() => setDeleteConfirmId(null))}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AutomationRulesManager;
