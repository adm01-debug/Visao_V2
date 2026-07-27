import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import {
  describeAttentionAdvice,
  type AttentionAdvice,
} from '@/lib/emap/attentionRouter';
import type { PlanNavItem } from '@/lib/emap/planNavigator';

export interface CrossFloorAttentionBannerProps {
  advice: AttentionAdvice;
  onGo: (planId: string) => void;
  onDismiss: (item: PlanNavItem) => void;
  className?: string;
}

/**
 * Onda 167 — convite para o andar mais grave.
 *
 * É apenas um convite: nada aqui troca a planta sozinho. O operador decide.
 */
export function CrossFloorAttentionBanner({
  advice,
  onGo,
  onDismiss,
  className,
}: CrossFloorAttentionBannerProps) {
  const target = advice.target;
  const label = describeAttentionAdvice(advice);
  if (!target || !label) return null;

  const tone =
    target.worst === 'alert'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : 'border-warning/40 bg-warning/10 text-warning';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm',
        tone,
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="gap-1"
        onClick={() => onGo(target.planId)}
      >
        Ir para a planta
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Dispensar aviso de ${target.name}`}
        onClick={() => onDismiss(target)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
