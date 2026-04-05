import {
  Pause,
  Loader2,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StreamStatus } from '@/types/streaming';

const statusConfig: Record<StreamStatus, { color: string; label: string; icon: typeof WifiOff; animate?: boolean }> = {
  disconnected: { color: 'bg-muted-foreground', label: 'Desconectado', icon: WifiOff },
  connecting: { color: 'bg-warning', label: 'Conectando...', icon: Loader2, animate: true },
  connected: { color: 'bg-primary', label: 'Conectado', icon: Wifi },
  playing: { color: 'bg-success', label: 'Ao Vivo', icon: Activity },
  buffering: { color: 'bg-warning', label: 'Carregando...', icon: Loader2, animate: true },
  paused: { color: 'bg-muted-foreground', label: 'Pausado', icon: Pause },
  error: { color: 'bg-destructive', label: 'Erro', icon: AlertTriangle },
  reconnecting: { color: 'bg-warning', label: 'Reconectando...', icon: RefreshCw, animate: true },
};

export function VideoStatusBadge({ status }: { status: StreamStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn('gap-1.5 text-foreground border-0', config.color)}>
      <Icon className={cn('w-3 h-3', config.animate && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}
