/**
 * VISÃO — Assistente de configuração inicial de uma câmera.
 * Etapa 1: definir zonas/locais (Entrada, Estacionamento, ...).
 * Etapa 2: aplicar regras iniciais de presença e comportamento perigoso.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/EmptyState';
import { ZoneEditorSheet } from '@/components/zones';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ruleTemplates, getSeverityLabel, type RuleTemplate } from '@/data/ruleTemplates';
import type { CameraData } from '@/components/cameras';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { ShieldAlert, Users, Layers3, Sparkles, Plus, Loader2, MapPin } from 'lucide-react';
import {
  applyCameraSetup,
  trackWizardEvent,
  startPostWizardDryRun,
  resetWizardSession,
  type WizardRuleInput,
} from '@/lib/wizardClient';

type DbZone = Tables<'zones'>;

interface CameraSetupWizardProps {
  camera: CameraData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Templates recomendados para o onboarding — presença + comportamento perigoso. */
const RECOMMENDED_TEMPLATE_IDS = [
  'intrusion-detection',
  'loitering-alert',
  'perimeter-breach',
  'abandoned-object',
  'restricted-zone-entry',
  'ppe-monitoring',
] as const;

const DEFAULT_SCHEDULE = {
  enabled: false,
  startTime: '00:00',
  endTime: '23:59',
  days: [0, 1, 2, 3, 4, 5, 6],
};

export function CameraSetupWizard({ camera, open, onOpenChange }: CameraSetupWizardProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'zones' | 'rules'>('zones');
  const [zones, setZones] = useState<DbZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DbZone | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set(RECOMMENDED_TEMPLATE_IDS));
  const [applying, setApplying] = useState(false);

  const recommended = useMemo(
    () => RECOMMENDED_TEMPLATE_IDS
      .map((id) => ruleTemplates.find((t) => t.id === id))
      .filter((t): t is RuleTemplate => Boolean(t)),
    [],
  );

  const loadZones = useCallback(async () => {
    if (!camera?.id) return;
    setLoadingZones(true);
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('camera_id', camera.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar zonas');
    } else {
      setZones(data ?? []);
    }
    setLoadingZones(false);
  }, [camera?.id]);

  useEffect(() => {
    if (open && camera?.id) {
      setTab('zones');
      setSelectedTemplates(new Set(RECOMMENDED_TEMPLATE_IDS));
      loadZones();
      void trackWizardEvent('started', 'zones', { camera_id: camera.id });
    }
  }, [open, camera?.id, loadZones]);

  const handleSaveZone = async (data: TablesInsert<'zones'> | TablesUpdate<'zones'>) => {
    if (editingZone) {
      const { error } = await supabase.from('zones').update(data as TablesUpdate<'zones'>).eq('id', editingZone.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('zones').insert(data as TablesInsert<'zones'>);
      if (error) throw error;
    }
    await loadZones();
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyRules = async () => {
    if (!camera?.id || !user?.id) return;
    const templates = recommended.filter((t) => selectedTemplates.has(t.id));
    if (templates.length === 0) {
      toast.info('Selecione ao menos uma regra para aplicar');
      return;
    }

    // Vincula cada regra à primeira zona compatível (por tipo) ou à primeira zona existente.
    const pickZoneId = (tpl: RuleTemplate): string | null => {
      if (zones.length === 0) return null;
      const byCategory = zones.find((z) =>
        (tpl.category === 'security' && ['restricted', 'safety', 'tripwire'].includes(z.type)) ||
        (tpl.category === 'safety' && z.type === 'safety'),
      );
      return (byCategory ?? zones[0])!.id;
    };

    const rulesPayload: WizardRuleInput[] = templates.map((tpl) => ({
      name: `${tpl.name} — ${camera.name}`,
      description: tpl.description,
      category: tpl.category,
      severity: tpl.severity,
      conditions: tpl.conditions as unknown as Json,
      actions: tpl.actions,
      zone_id: pickZoneId(tpl),
      is_active: true,
    }));

    setApplying(true);
    try {
      const result = await applyCameraSetup(camera.id, [], rulesPayload);
      if (result.from_cache) {
        toast.info('Configuração já havia sido aplicada', {
          description: 'Detectamos um reenvio e reutilizamos o resultado anterior sem duplicar regras.',
        });
      } else {
        toast.success(`${result.rule_ids.length} regra(s) aplicada(s) à câmera ${camera.name}`);
      }
      void trackWizardEvent('completed', 'rules', {
        camera_id: camera.id,
        rules: result.rule_ids.length,
        zones: zones.length,
      });
      const dryRun = await startPostWizardDryRun(camera.id, result.rule_ids, 15);
      if (dryRun) {
        toast.info('Modo teste iniciado por 15 minutos', {
          description: 'Detecções serão registradas sem disparar notificações reais.',
        });
      }
      resetWizardSession();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao aplicar configuração';
      toast.error('Erro ao aplicar regras', { description: message });
      void trackWizardEvent('abandoned', 'rules', {
        camera_id: camera.id,
        error: message,
      });
    } finally {
      setApplying(false);
    }
  };

  if (!camera) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Configuração inicial — {camera.name}
            </DialogTitle>
            <DialogDescription>
              Defina locais/zonas dentro da imagem e aplique regras de monitoramento de presença e
              comportamento perigoso em poucos cliques.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'zones' | 'rules')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="zones" className="gap-2">
                <MapPin className="h-4 w-4" /> 1. Zonas ({zones.length})
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2">
                <ShieldAlert className="h-4 w-4" /> 2. Regras iniciais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zones" className="flex-1 overflow-hidden mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  Desenhe zonas como Entrada, Estacionamento ou Área Restrita para restringir onde
                  as regras vão disparar.
                </p>
                <Button size="sm" onClick={() => { setEditingZone(null); setEditorOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nova zona
                </Button>
              </div>
              <ScrollArea className="h-[300px] pr-3">
                {loadingZones ? (
                  <div className="flex justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : zones.length === 0 ? (
                  <EmptyState
                    icon={Layers3}
                    title="Nenhuma zona ainda"
                    description="Comece criando a primeira zona desta câmera (ex: Entrada Principal)."
                  />
                ) : (
                  <ul className="space-y-2">
                    {zones.map((z) => (
                      <li key={z.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-card">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: z.color || 'hsl(var(--primary))' }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{z.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{z.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={z.is_active ? 'default' : 'outline'}>
                            {z.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingZone(z); setEditorOpen(true); }}>
                            Editar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
              <div className="flex justify-end mt-3">
                <Button variant="secondary" onClick={() => setTab('rules')}>
                  Avançar para regras →
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="flex-1 overflow-hidden mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Ative regras iniciais aplicadas <span className="font-medium">apenas a esta câmera</span>.
                Você pode ajustar tudo depois em <span className="font-medium">Regras</span>.
              </p>
              <ScrollArea className="h-[320px] pr-3">
                <ul className="space-y-2">
                  {recommended.map((tpl) => {
                    const checked = selectedTemplates.has(tpl.id);
                    return (
                      <li key={tpl.id}
                        className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-muted/40 transition-colors">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleTemplate(tpl.id)}
                          className="mt-1"
                          aria-label={`Selecionar ${tpl.name}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{tpl.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {getSeverityLabel(tpl.severity)}
                            </Badge>
                            {tpl.category === 'security' && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Users className="h-3 w-3" /> presença
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {tab === 'rules' && (
              <Button onClick={handleApplyRules} disabled={applying || selectedTemplates.size === 0}>
                {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aplicar {selectedTemplates.size} regra(s)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ZoneEditorSheet
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        camera={camera ? {
          id: camera.id,
          name: camera.name,
          stream_url: camera.stream_url ?? null,
          stream_protocol: (camera as unknown as { stream_protocol?: string }).stream_protocol,
          thumbnail: camera.thumbnail ?? null,
        } : null}
        zone={editingZone}
        onSave={handleSaveZone}
      />
    </>
  );
}

export default CameraSetupWizard;
