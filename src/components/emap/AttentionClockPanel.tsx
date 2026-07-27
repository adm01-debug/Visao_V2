import { useEffect, useState } from 'react';
import { Clock, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  attentionAge,
  bandOf,
  formatAge,
  rankAttention,
  statusAge,
  summarizeAttention,
  type AttentionBand,
  type AttentionLedger,
} from '@/lib/emap/attentionClock';
import type { MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';

export interface AttentionClockPanelProps {
  ledger: AttentionLedger;
  nameOf: (cameraId: string) => string;
  onAcknowledge: (cameraId: string) => void;
  /** Quantas linhas mostrar. O resto vira contagem — lista infinita não é fila. */
  limit?: number;
  className?: string;
}

const STATUS_LABEL: Record<MapMarkerStatus, string> = {
  alert: 'em alerta',
  offline: 'fora do ar',
  warning: 'com aviso',
  unknown: 'sem estado',
  online: 'operando',
};

const BAND_LABEL: Record<AttentionBand, string> = {
  fresh: 'recente',
  sustained: 'sustentado',
  prolonged: 'prolongado',
};

const BAND_VARIANT: Record<AttentionBand, 'secondary' | 'outline' | 'destructive'> = {
  fresh: 'secondary',
  sustained: 'outline',
  prolonged: 'destructive',
};

/**
 * Onda 168 — "há quanto tempo isto está assim".
 *
 * O painel só aparece quando existe atenção aberta: card cronicamente vazio
 * treina o operador a não olhar. O relógio avança por `setInterval` local
 * apenas para repintar o rótulo — a verdade vive no livro, não na tela.
 */
export function AttentionClockPanel({
  ledger,
  nameOf,
  onAcknowledge,
  limit = 6,
  className,
}: AttentionClockPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const summary = summarizeAttention(ledger, now);
  if (summary.total === 0) return null;

  const ranked = rankAttention(ledger, now);
  const visible = ranked.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Tempo em atenção
          <Badge variant="secondary">{summary.total}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mais antigo aberto há {formatAge(summary.oldestAgeMs)}. Confirmar o mesmo estado não
          reinicia o relógio — só a normalização apaga.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(summary.byBand) as AttentionBand[])
            .filter((band) => summary.byBand[band] > 0)
            .map((band) => (
              <Badge key={band} variant={BAND_VARIANT[band]}>
                {summary.byBand[band]} {BAND_LABEL[band]}
              </Badge>
            ))}
        </div>

        <ul className="space-y-2" aria-live="polite">
          {visible.map((entry) => {
            const band = bandOf(entry, now);
            return (
              <li
                key={entry.cameraId}
                className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{nameOf(entry.cameraId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABEL[entry.status]} há {formatAge(statusAge(entry, now))}
                    {entry.changes > 0 && (
                      <> · em atenção contínua há {formatAge(attentionAge(entry, now))}</>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={BAND_VARIANT[band]}>{BAND_LABEL[band]}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAcknowledge(entry.cameraId)}
                    aria-label={`Reconhecer ${nameOf(entry.cameraId)}`}
                  >
                    <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                    Ciente
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        {ranked.length > visible.length && (
          <p className="text-xs text-muted-foreground">
            e mais {ranked.length - visible.length} câmera(s) em atenção…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
