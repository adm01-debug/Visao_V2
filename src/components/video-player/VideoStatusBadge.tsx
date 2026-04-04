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
  disconnected: { color: 'bg-gray-500', label: 'Desconectado', icon: WifiOff },
  connecting: { color: 'bg-yellow-500', label: 'Conectando...', icon: Loader2, animate: true },
  connected: { color: 'bg-blue-500', label: 'Conectado', icon: Wifi },
  playing: { color: 'bg-green-500', label: 'Ao Vivo', icon: Activity },
  buffering: { color: 'bg-yellow-500', label: 'Carregando...', icon: Loader2, animate: true },
  paused: { color: 'bg-gray-500', label: 'Pausado', icon: Pause },
  error: { color: 'bg-red-500', label: 'Erro', icon: AlertTriangle },
  reconnecting: { color: 'bg-orange-500', label: 'Reconectando...', icon: RefreshCw, animate: true },
};

export function VideoStatusBadge({ status }: { status: StreamStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn('gap-1.5 text-white border-0', config.color)}>
      <Icon className={cn('w-3 h-3', config.animate && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}
