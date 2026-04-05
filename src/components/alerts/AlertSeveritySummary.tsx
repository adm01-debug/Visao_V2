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
    bg: 'bg-destructive/10 border-destructive/30',
    text: 'text-destructive',
    accent: 'bg-destructive',
  },
  {
    key: 'high' as const,
    label: 'Alto',
    icon: AlertTriangle,
    tooltip: 'Alertas que necessitam de ação em breve',
    bg: 'bg-warning/10 border-warning/30',
    text: 'text-warning',
    accent: 'bg-warning',
  },
  {
    key: 'medium' as const,
    label: 'Médio',
    icon: AlertCircle,
    tooltip: 'Alertas que requerem monitoramento',
    bg: 'bg-primary/10 border-primary/30',
    text: 'text-primary',
    accent: 'bg-primary',
  },
  {
    key: 'low' as const,
    label: 'Baixo',
    icon: Info,
    tooltip: 'Eventos informativos, sem risco imediato',
    bg: 'bg-muted border-border',
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
    <div className="flex flex-col gap-3">
      {/* Severity cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  counts[key] > 0 && 'shadow-sm',
                  isActive && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-[1.02]',
                  !isActive && 'hover:scale-[1.01] hover:shadow-md'
                )}
                role="status"
                aria-label={`${counts[key]} alertas de severidade ${label}`}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', text)} aria-hidden="true" />
                <div className="min-w-0">
                  <p className={cn('text-lg font-bold leading-none', text)}>{counts[key]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
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

      {/* Distribution bar */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden bg-muted" role="img" aria-label="Distribuição de alertas por severidade">
          {severityItems.map(({ key, accent, label }) => {
            const pct = (counts[key] / total) * 100;
            if (pct === 0) return null;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn('h-full transition-all', accent)}
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
