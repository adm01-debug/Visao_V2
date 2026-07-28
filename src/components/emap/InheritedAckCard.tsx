import { AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAge } from '@/lib/emap/attentionClock';
import type { InheritedAck } from '@/lib/emap/ackHandoff';
import { summarizeAckHandoff } from '@/lib/emap/ackHandoff';
import type { MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';

const STATUS_LABEL: Record<MapMarkerStatus, string> = {
  alert: 'em alerta',
  offline: 'fora do ar',
  warning: 'com aviso',
  unknown: 'sem estado',
  online: 'operando',
};

export interface InheritedAckCardProps {
  inherited: readonly InheritedAck[];
  nameOf: (cameraId: string) => string;
  /** Leva o operador até a câmera no mapa. */
  onFocus?: (cameraId: string) => void;
  /** Encerra a revalidação (o operador leu a lista). */
  onDismiss: () => void;
  className?: string;
}

/**
 * Onda 173 — revalidação da ciência herdada.
 *
 * O card só existe quando havia "eu já vi" de um turno anterior sobre fatos
 * que continuam abertos. Ele não decide nada: mostra o que foi reconhecido,
 * por qual estado, e se a situação piorou desde então. Os itens voltaram à
 * fila de triagem no instante em que este card apareceu — dispensar aqui é
 * apenas parar de exibir o aviso, nunca silenciar a pendência.
 */
export function InheritedAckCard({
  inherited,
  nameOf,
  onFocus,
  onDismiss,
  className,
}: InheritedAckCardProps) {
  if (inherited.length === 0) return null;
  const summary = summarizeAckHandoff(inherited);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          Ciência do turno anterior
          <Badge variant="destructive">{summary.total}</Badge>
          {summary.escalated > 0 && (
            <Badge variant="outline">{summary.escalated} agravou</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Estas pendências foram reconhecidas antes do início deste turno e voltaram à fila para
          revalidação. Reconhecer não resolve — confirme você mesmo.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1">
          {inherited.map((item) => (
            <li
              key={item.cameraId}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm"
            >
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onFocus?.(item.cameraId)}
              >
                {nameOf(item.cameraId)}
              </button>
              <span className="text-muted-foreground">
                {STATUS_LABEL[item.currentStatus]} há {formatAge(item.ageMs)} · ciente como{' '}
                {STATUS_LABEL[item.ackedStatus]}
              </span>
              {item.escalated && <Badge variant="destructive">agravou</Badge>}
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" onClick={onDismiss}>
          <Check className="mr-1 h-4 w-4" aria-hidden="true" />
          Revalidação lida
        </Button>
      </CardContent>
    </Card>
  );
}
