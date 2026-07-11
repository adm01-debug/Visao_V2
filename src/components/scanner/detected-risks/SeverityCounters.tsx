import { cn } from '@/lib/utils';
import { SEVERITY_STYLES, type RiskSeverity } from './types';

interface SeverityCountersProps {
  counts: Record<RiskSeverity, number>;
}

export function SeverityCounters({ counts }: SeverityCountersProps) {
  const order: RiskSeverity[] = ['critical', 'high', 'medium', 'low'];
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {order.map((sev) => {
        const c = counts[sev];
        if (c === 0) return null;
        const s = SEVERITY_STYLES[sev];
        return (
          <span
            key={sev}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
              s.bg,
              s.text,
            )}
            title={`${c} ${s.label.toLowerCase()}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {c}
          </span>
        );
      })}
    </div>
  );
}
