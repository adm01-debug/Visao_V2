import { BellOff, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { describeSuppressionReason, type SuppressionSummary } from '@/lib/emap/suppressionLedger';

export interface SuppressedNoticesPanelProps {
  summary: SuppressionSummary;
  nameOf: (cameraId: string) => string;
  onDismiss: (cameraId: string) => void;
  className?: string;
}

const relative = (timestamp: number): string => {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'agora há pouco';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.round(minutes / 60)} h`;
};

/**
 * Onda 165 — mostra o que o mapa decidiu não interromper.
 *
 * O painel só existe quando há algo retido: um card permanentemente vazio
 * treina o operador a ignorá-lo.
 */
export function SuppressedNoticesPanel({
  summary,
  nameOf,
  onDismiss,
  className,
}: SuppressedNoticesPanelProps) {
  if (summary.total === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Avisos silenciados
          <Badge variant="secondary">{summary.total}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Agravamentos que não viraram alerta na tela, para você conferir o que o filtro de ruído
          reteve.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-2" aria-live="polite">
          {summary.cameras.map((camera) => (
            <li
              key={camera.cameraId}
              className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{nameOf(camera.cameraId)}</p>
                <p className="text-sm text-muted-foreground">
                  {camera.total} {camera.total === 1 ? 'aviso retido' : 'avisos retidos'} ·{' '}
                  {describeSuppressionReason(camera.dominantReason)} · {relative(camera.lastAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(camera.cameraId)}
                aria-label={`Marcar avisos de ${nameOf(camera.cameraId)} como vistos`}
              >
                <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
                Ciente
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
