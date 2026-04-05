import { Info, AlertCircle, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SeverityCounts {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

const severityItems = [
  {
    key: 'critical' as const,
    label: 'Crítico',
    icon: Flame,
    tooltip: 'Alertas que requerem atenção imediata',
    bg: 'bg-[hsl(var(--severity-critical)/0.08)] border-[hsl(var(--severity-critical)/0.2)]',
    text: 'text-[hsl(var(--severity-critical))]',
    accent: 'bg-[hsl(var(--severity-critical))]',
  },
  {
    key: 'high' as const,
    label: 'Alto',
    icon: AlertTriangle,
    tooltip: 'Alertas que necessitam de ação em breve',
    bg: 'bg-[hsl(var(--severity-high)/0.08)] border-[hsl(var(--severity-high)/0.2)]',
    text: 'text-[hsl(var(--severity-high))]',
    accent: 'bg-[hsl(var(--severity-high))]',
  },
  {
    key: 'medium' as const,
    label: 'Médio',
    icon: AlertCircle,
    tooltip: 'Alertas que requerem monitoramento',
    bg: 'bg-[hsl(var(--severity-medium)/0.08)] border-[hsl(var(--severity-medium)/0.2)]',
    text: 'text-[hsl(var(--severity-medium))]',
    accent: 'bg-[hsl(var(--severity-medium))]',
  },
  {
    key: 'low' as const,
    label: 'Baixo',
    icon: Info,
    tooltip: 'Eventos informativos, sem risco imediato',
    bg: 'bg-muted/50 border-border',
    text: 'text-muted-foreground',
    accent: 'bg-muted-foreground',
  },
] as const;

interface AlertSeveritySummaryProps {
  counts: SeverityCounts;
  total: number;
  activeSeverity?: string;
  onSeverityClick?: (severity: string) => void;
}

export function AlertSeveritySummary({ counts, total, activeSeverity, onSeverityClick }: AlertSeveritySummaryProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {severityItems.map(({ key, label, icon: Icon, tooltip, bg, text }) => {
          const isActive = activeSeverity === key;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSeverityClick?.(isActive ? 'all' : key)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer text-left w-full',
                    bg,
                    isActive && 'ring-2 ring-offset-1 ring-offset-background ring-primary scale-[1.01]',
                    !isActive && 'hover:brightness-110'
                  )}
                  role="status"
                  aria-label={`${counts[key]} alertas de severidade ${label}`}
                >
                  <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', text)} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className={cn('text-lg font-bold leading-none tabular-nums', text)}>{counts[key]}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{label}</p>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center">
                <p className="text-xs">{tooltip}{isActive ? ' (clique para remover filtro)' : ' (clique para filtrar)'}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {total > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50" role="img" aria-label="Distribuição de alertas por severidade">
          {severityItems.map(({ key, accent, label }) => {
            const pct = (counts[key] / total) * 100;
            if (pct === 0) return null;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn('h-full transition-all duration-500', accent)}
                    style={{ width: `${pct}%` }}
                    aria-label={`${label}: ${pct.toFixed(0)}%`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{label}: {counts[key]} ({pct.toFixed(0)}%)</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
