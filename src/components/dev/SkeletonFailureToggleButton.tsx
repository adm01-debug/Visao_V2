import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getSkeletonFailureMode,
  setSkeletonFailureMode,
  subscribeSkeletonFailure,
  isSkeletonDebugEnabled,
  type SkeletonFailureMode,
} from '@/lib/skeletonFailureFlag';

const ORDER: SkeletonFailureMode[] = ['off', 'cameras', 'alerts', 'zones', 'all'];
const LABELS: Record<SkeletonFailureMode, string> = {
  off: 'OFF',
  cameras: 'Câmeras',
  alerts: 'Alertas',
  zones: 'Zonas',
  all: 'Todas',
};

/**
 * Botão flutuante DEV/QA para simular falha no carregamento de skeletons.
 * Ciclo: OFF → Câmeras → Alertas → Zonas → Todas → OFF.
 * Ao mudar, recarrega a página atual para forçar re-render do lazy chunk.
 */
export function SkeletonFailureToggleButton() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<SkeletonFailureMode>('off');

  useEffect(() => {
    setVisible(isSkeletonDebugEnabled());
    setMode(getSkeletonFailureMode());
    const unsub = subscribeSkeletonFailure((m) => setMode(m));
    return () => {
      unsub();
    };
  }, []);

  if (!visible) return null;

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];

  const handleClick = () => {
    setSkeletonFailureMode(next);
    // força reload para o lazy chunk reavaliar a flag (Suspense já montou).
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const isActive = mode !== 'off';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isActive}
      aria-label={`Simular falha de skeleton: ${LABELS[mode]}. Próximo: ${LABELS[next]}`}
      title={`Skeleton-fail: ${LABELS[mode]} → clique para ${LABELS[next]} (recarrega)`}
      className={cn(
        'fixed z-[60] bottom-4 right-44 flex items-center gap-2 px-3 py-2 rounded-full',
        'text-xs font-medium shadow-lg border transition-colors',
        'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'ring-2 ring-destructive/50 text-destructive'
          : 'opacity-80',
      )}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>Fail: {LABELS[mode]}</span>
    </button>
  );
}

export default SkeletonFailureToggleButton;
