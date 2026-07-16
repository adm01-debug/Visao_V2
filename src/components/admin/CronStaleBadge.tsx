import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useCronFreshness } from '@/hooks/useCronFreshness';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Wave 38 — Badge no header exibindo Nº de cron jobs em `stale`.
 * Visível apenas para admins; oculto quando saudável ou role ainda carregando.
 * Ao clicar, navega para `/operations` onde o detalhamento vive.
 */
export function CronStaleBadge({ className }: { className?: string }) {
  const { isAdmin, loading } = useUserRole();
  const { data } = useCronFreshness(isAdmin && !loading);

  const { count, names } = useMemo(() => {
    if (!data) return { count: 0, names: [] as string[] };
    const stale = data.filter((r) => r.status === 'stale');
    return { count: stale.length, names: stale.map((r) => r.jobname) };
  }, [data]);

  if (!isAdmin || loading || count === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/operations"
          aria-label={`${count} cron ${count === 1 ? 'atrasado' : 'atrasados'}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
            'bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          {count} {count === 1 ? 'cron atrasado' : 'crons atrasados'}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-[240px]">
          <p className="font-medium">Jobs com atraso:</p>
          <ul className="mt-1 text-xs space-y-0.5">
            {names.slice(0, 5).map((n) => (
              <li key={n}>• {n}</li>
            ))}
            {names.length > 5 && <li className="text-muted-foreground">+{names.length - 5}…</li>}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
