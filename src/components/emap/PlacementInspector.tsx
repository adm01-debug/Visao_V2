import { Compass, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { MapMarkerStatus, MapPlacement } from '@/lib/emap/floorPlanGeometry';

export interface PlacementInspectorProps {
  placement: MapPlacement | null;
  onAim: (placementId: string, headingDeg: number, fovDeg: number) => void;
  onRemove: (placementId: string) => void;
}

const STATUS_LABEL: Record<MapMarkerStatus, string> = {
  alert: 'Em alerta',
  offline: 'Fora do ar',
  warning: 'Com aviso',
  online: 'Operando',
  unknown: 'Estado desconhecido',
};

const STATUS_VARIANT: Record<MapMarkerStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    alert: 'destructive',
    offline: 'secondary',
    warning: 'outline',
    online: 'default',
    unknown: 'secondary',
  };

export function PlacementInspector({ placement, onAim, onRemove }: PlacementInspectorProps) {
  if (!placement) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Marcador</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Selecione uma câmera no mapa para ajustar a direção e a abertura do campo de visão.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="truncate">{placement.label}</span>
          <Badge variant={STATUS_VARIANT[placement.status]}>
            {STATUS_LABEL[placement.status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Compass className="h-4 w-4" aria-hidden="true" />
            Direção: {Math.round(placement.headingDeg)}°
          </Label>
          <Slider
            aria-label="Direção da câmera em graus"
            value={[placement.headingDeg]}
            min={0}
            max={359}
            step={1}
            onValueChange={([value]) => onAim(placement.id, value ?? 0, placement.fovDeg)}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Campo de visão: {placement.fovDeg === 0 ? 'não informado' : `${Math.round(placement.fovDeg)}°`}
          </Label>
          <Slider
            aria-label="Abertura do campo de visão em graus"
            value={[placement.fovDeg]}
            min={0}
            max={360}
            step={5}
            onValueChange={([value]) => onAim(placement.id, placement.headingDeg, value ?? 0)}
          />
          <p className="text-xs text-muted-foreground">
            Zero significa "não sei a abertura" — nesse caso o cone não é desenhado, para não
            sugerir cobertura que ninguém conferiu.
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Posição: {(placement.position.x * 100).toFixed(1)}% ×{' '}
          {(placement.position.y * 100).toFixed(1)}% da planta. Arraste no mapa ou use as setas do
          teclado (Shift para passos maiores).
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onRemove(placement.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Remover da planta
        </Button>
      </CardContent>
    </Card>
  );
}
