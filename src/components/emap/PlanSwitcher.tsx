import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  describePlanStatus,
  type PlanNavItem,
} from '@/lib/emap/planNavigator';
import type { MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';

export interface PlanSwitcherProps {
  items: readonly PlanNavItem[];
  onSelect: (planId: string) => void;
  className?: string;
}

/** Cor do selo segue a paleta semântica de severidade do projeto. */
const STATUS_TONE: Record<MapMarkerStatus, string> = {
  alert: 'bg-destructive/15 text-destructive border-destructive/30',
  offline: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/15 text-warning border-warning/30',
  online: 'bg-success/15 text-success border-success/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

/**
 * Onda 166 — troca rápida de andar.
 *
 * Mostra o pior estado de cada planta antes do clique: o operador precisa
 * saber onde está o problema sem ter que visitar andar por andar.
 */
export function PlanSwitcher({ items, onSelect, className }: PlanSwitcherProps) {
  if (items.length <= 1) return null;

  return (
    <nav
      className={cn('flex flex-wrap items-center gap-2', className)}
      aria-label="Plantas do local"
    >
      {items.map((item) => (
        <Button
          key={item.planId}
          type="button"
          variant={item.isActive ? 'default' : 'outline'}
          size="sm"
          aria-current={item.isActive ? 'true' : undefined}
          title={
            item.shortcut
              ? `${item.name} — ${describePlanStatus(item)} (tecla ${item.shortcut})`
              : `${item.name} — ${describePlanStatus(item)}`
          }
          onClick={() => onSelect(item.planId)}
          className="gap-2"
        >
          {item.shortcut !== null && (
            <span className="text-xs font-mono opacity-70">{item.shortcut}</span>
          )}
          <span className="max-w-[10rem] truncate">{item.name}</span>
          <Badge
            variant="outline"
            className={cn('px-1.5 py-0 text-[10px] font-normal', STATUS_TONE[item.worst])}
          >
            {item.attention > 0 ? item.attention : item.cameraCount}
          </Badge>
        </Button>
      ))}
    </nav>
  );
}
