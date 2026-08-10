/**
 * Onda 189 — Barra de janelas destacadas.
 *
 * Mostra o livro vivo de janelas em segundo monitor, com o tempo desde a última
 * batida de ponto. Silêncio é exibido como fato ("sem sinal"), nunca escondido.
 */
import { memo } from 'react';
import { Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  HEARTBEAT_TIMEOUT_MS,
  MAX_DETACHED_WINDOWS,
  type DetachedWindow,
} from '@/lib/views/detachedMonitor';

interface DetachedMonitorsBarProps {
  detached: readonly DetachedWindow[];
  cameraNames: Readonly<Record<string, string>>;
  now: number;
  onClose: (cameraId: string) => void;
  className?: string;
}

function DetachedMonitorsBarImpl({
  detached,
  cameraNames,
  now,
  onClose,
  className,
}: DetachedMonitorsBarProps) {
  if (detached.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma janela destacada. Use “Destacar” em uma célula para enviar a câmera ao segundo
        monitor (até {MAX_DETACHED_WINDOWS} janelas).
      </p>
    );
  }

  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {detached.map((entry) => {
        const silent = now - entry.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS;
        return (
          <li
            key={entry.cameraId}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
          >
            <Monitor className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="max-w-[12rem] truncate text-sm">
              {cameraNames[entry.cameraId] ?? entry.cameraId}
            </span>
            <Badge variant={silent ? 'destructive' : 'secondary'} className="text-[10px]">
              {silent ? 'sem sinal' : 'ativa'}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onClose(entry.cameraId)}
              aria-label={`Fechar janela destacada de ${cameraNames[entry.cameraId] ?? entry.cameraId}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export const DetachedMonitorsBar = memo(DetachedMonitorsBarImpl);
