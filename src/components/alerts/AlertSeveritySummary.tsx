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
    bg: 'bg-severity-critical/6 border-severity-critical/15 hover:bg-severity-critical/10',
    text: 'text-severity-critical',
    accent: 'bg-severity-critical',
    iconBg: 'bg-severity-critical/10',
  },
  {
    key: 'high' as const,
    label: 'Alto',
    icon: AlertTriangle,
    tooltip: 'Alertas que necessitam de ação em breve',
    bg: 'bg-severity-high/6 border-severity-high/15 hover:bg-severity-high/10',
    text: 'text-severity-high',
    accent: 'bg-severity-high',
    iconBg: 'bg-severity-high/10',
  },
  {
    key: 'medium' as const,
    label: 'Médio',
    icon: AlertCircle,
    tooltip: 'Alertas que requerem monitoramento',
    bg: 'bg-severity-medium/6 border-severity-medium/15 hover:bg-severity-medium/10',
    text: 'text-severity-medium',
    accent: 'bg-severity-medium',
    iconBg: 'bg-severity-medium/10',
  },
  {
    key: 'low' as const,
    label: 'Baixo',
    icon: Info,
    tooltip: 'Eventos informativos, sem risco imediato',
    bg: 'bg-severity-low/6 border-severity-low/15 hover:bg-severity-low/10',
    text: 'text-severity-low',
    accent: 'bg-severity-low',
    iconBg: 'bg-severity-low/10',
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
                    'flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer text-left w-full',
                    bg,
                    isActive && 'ring-2 ring-offset-1 ring-offset-background ring-primary scale-[1.01]',
                    !isActive && 'hover:brightness-110 hover:shadow-sm'
                  )}
                  style={{ boxShadow: isActive ? 'var(--shadow-card-hover)' : undefined }}
                  role="status"
                  aria-label={`${counts[key]} alertas de severidade ${label}`}
                >
                  <div className={cn('p-1.5 rounded-lg', text === 'text-muted-foreground' ? 'bg-muted' : `${text.replace('text-', 'bg-')}/10`)}>
                    <Icon className={cn('w-4 h-4 flex-shrink-0', text)} aria-hidden="true" />
                  </div>
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
