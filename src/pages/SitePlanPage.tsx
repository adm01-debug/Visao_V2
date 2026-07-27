import { useCallback, useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, MapPin } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FloorPlanCanvas } from '@/components/emap/FloorPlanCanvas';
import { UploadPlanDialog } from '@/components/emap/UploadPlanDialog';
import { PlacementInspector } from '@/components/emap/PlacementInspector';
import { SuppressedNoticesPanel } from '@/components/emap/SuppressedNoticesPanel';
import { PlanSwitcher } from '@/components/emap/PlanSwitcher';
import { CrossFloorAttentionBanner } from '@/components/emap/CrossFloorAttentionBanner';
import { AttentionClockPanel } from '@/components/emap/AttentionClockPanel';
import { isEditableTarget, resolveShortcutTarget, stepPlan, type PlanNavItem } from '@/lib/emap/planNavigator';
import {
  adviseCrossFloorAttention,
  pruneDismissals,
  recordDismissal,
  type DismissalLedger,
} from '@/lib/emap/attentionRouter';
import {
  clearAttention,
  emptyAttentionLedger,
  observeAttention,
  pruneAttention,
  type AttentionLedger,
} from '@/lib/emap/attentionClock';

import { useSitePlans } from '@/hooks/useSitePlans';
import { summarizePlan, type MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';


const SUMMARY_LABEL: Record<MapMarkerStatus, string> = {
  alert: 'em alerta',
  offline: 'fora do ar',
  warning: 'com aviso',
  online: 'operando',
  unknown: 'sem estado',
};

export default function SitePlanPage() {
  const {
    plans,
    planNavigation,
    activePlan,
    activePlanId,
    setActivePlanId,
    planImageUrl,
    placements,
    pulsingCameraIds,
    suppressionSummary,
    dismissSuppressions,
    cameras,
    unplacedCameras,
    loading,
    saving,
    error,
    createPlan,
    addPlacement,
    movePlacement,
    updateAim,
    removePlacement,
  } = useSitePlans();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => placements.find((placement) => placement.id === selectedId) ?? null,
    [placements, selectedId],
  );
  const summary = useMemo(() => summarizePlan(placements), [placements]);
  const nameOf = useCallback(
    (cameraId: string) => cameras.find((camera) => camera.id === cameraId)?.name ?? 'Câmera',
    [cameras],
  );

  /**
   * Onda 167 — convite para o andar mais grave. A dispensa é por estado
   * observado: se o andar piorar (ou ganhar mais câmeras em atenção), o
   * convite reaparece sozinho.
   */
  const [dismissals, setDismissals] = useState<DismissalLedger>([]);
  const attentionAdvice = useMemo(
    () =>
      adviseCrossFloorAttention({
        items: planNavigation.items,
        activePlanId: planNavigation.resolvedActiveId,
        dismissals,
      }),
    [planNavigation.items, planNavigation.resolvedActiveId, dismissals],
  );
  const dismissAttention = useCallback((item: PlanNavItem) => {
    setDismissals((previous) => recordDismissal(previous, item));
  }, []);
  // Planta apagada não pode deixar dispensa órfã acumulando na memória.
  useEffect(() => {
    setDismissals((previous) => {
      const next = pruneDismissals(previous, planNavigation.items);
      return next.length === previous.length ? previous : next;
    });
  }, [planNavigation.items]);


  /**
   * Onda 166 — atalhos de andar. Teclas 1..9 saltam direto; setas ←/→ varrem
   * em círculo. Nada dispara enquanto o foco está num campo de texto: roubar
   * o dígito de quem digita o nome da planta seria pior que não ter atalho.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const direct = resolveShortcutTarget(planNavigation.items, event.key);
      if (direct) {
        event.preventDefault();
        setActivePlanId(direct);
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = stepPlan(
        planNavigation.items,
        planNavigation.resolvedActiveId,
        event.key === 'ArrowLeft' ? 'previous' : 'next',
      );
      if (target) {
        event.preventDefault();
        setActivePlanId(target);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [planNavigation, setActivePlanId]);


  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageMeta
        title="Planta Baixa — VISÃO"
        description="Mapa de situação: posicione as câmeras na planta do local e veja o estado de cada ponto em tempo real."
      />

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapIcon className="h-6 w-6 text-primary" aria-hidden="true" />
            Planta Baixa
          </h1>
          <p className="text-sm text-muted-foreground">
            Posicione cada câmera onde ela realmente está. O mapa mostra o pior estado quando
            marcadores ficam próximos demais — nunca a média.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 0 && (
            <Select value={activePlanId ?? undefined} onValueChange={setActivePlanId}>
              <SelectTrigger className="w-56" aria-label="Planta ativa">
                <SelectValue placeholder="Escolha a planta" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <UploadPlanDialog saving={saving} onCreate={createPlan} />
        </div>
      </header>

      <PlanSwitcher items={planNavigation.items} onSelect={setActivePlanId} />

      <CrossFloorAttentionBanner
        advice={attentionAdvice}
        onGo={setActivePlanId}
        onDismiss={dismissAttention}
      />


      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-lg" />
      ) : !activePlan ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <MapIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Nenhuma planta cadastrada ainda. Envie a imagem do local para começar a posicionar as
              câmeras.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{summary.total} câmeras na planta</Badge>
              {(Object.keys(summary.byStatus) as MapMarkerStatus[])
                .filter((status) => summary.byStatus[status] > 0)
                .map((status) => (
                  <Badge key={status} variant="outline">
                    {summary.byStatus[status]} {SUMMARY_LABEL[status]}
                  </Badge>
                ))}
              {summary.outOfBounds > 0 && (
                <Badge variant="destructive">
                  {summary.outOfBounds} marcador(es) fora da planta, reposicionados
                </Badge>
              )}
            </div>

            {planImageUrl ? (
              <FloorPlanCanvas
                imageUrl={planImageUrl}
                imageWidth={activePlan.imageWidth}
                imageHeight={activePlan.imageHeight}
                placements={placements}
                selectedId={selectedId}
                pulsingCameraIds={pulsingCameraIds}
                onSelect={setSelectedId}
                onMove={(id, position) => void movePlacement(id, position)}
                className="h-[520px]"
              />
            ) : (
              <Skeleton className="h-[520px] w-full rounded-lg" />
            )}
          </div>

          <div className="space-y-4">
            <PlacementInspector
              placement={selected}
              onAim={(id, heading, fov) => void updateAim(id, heading, fov)}
              onRemove={(id) => {
                void removePlacement(id);
                setSelectedId(null);
              }}
            />

            <SuppressedNoticesPanel
              summary={suppressionSummary}
              nameOf={nameOf}
              onDismiss={dismissSuppressions}
            />



            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Câmeras fora da planta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unplacedCameras.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todas as câmeras já estão posicionadas nesta planta.
                  </p>
                ) : (
                  unplacedCameras.slice(0, 20).map((camera) => (
                    <Button
                      key={camera.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => void addPlacement(camera.id, { x: 0.5, y: 0.5 })}
                    >
                      <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                      <span className="truncate">{camera.name}</span>
                    </Button>
                  ))
                )}
                {unplacedCameras.length > 20 && (
                  <p className="text-xs text-muted-foreground">
                    e mais {unplacedCameras.length - 20} câmeras…
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
