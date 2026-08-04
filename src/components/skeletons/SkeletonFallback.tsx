/**
 * SkeletonFallback - Skeleton genérico mínimo, sem dependências externas
 * (apenas `cn` + Tailwind animate-pulse). Usado como último recurso quando
 * um skeleton branded falha ao montar.
 *
 * Variantes contextuais para combinar com a área que está carregando:
 *   - `page`    (default): bloco vertical com header + área grande
 *   - `cards`   : grade responsiva de cards (câmeras, alertas-grid)
 *   - `table`   : header + linhas para listas tabulares
 *   - `filters` : barra horizontal compacta (search + selects + ações)
 *   - `inline`  : altura mínima (badge/contador), evita pular layout
 */
import { cn } from '@/lib/utils';

export type SkeletonFallbackVariant = 'page' | 'cards' | 'table' | 'filters' | 'inline';

interface SkeletonFallbackProps {
  label?: string;
  className?: string;
  variant?: SkeletonFallbackVariant;
  /** Ajusta a quantidade de itens em variantes repetitivas (cards/table). */
  count?: number;
}

export function SkeletonFallback({
  label = 'Carregando…',
  className,
  variant = 'page',
  count,
}: SkeletonFallbackProps) {
  const commonAria = {
    role: 'status' as const,
    'aria-live': 'polite' as const,
    'aria-busy': true,
    'aria-label': label,
  };

  if (variant === 'inline') {
    return (
      <div
        {...commonAria}
        className={cn('inline-flex items-center gap-2 animate-pulse min-h-[24px]', className)}
      >
        <div className="h-4 w-20 rounded bg-muted" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'filters') {
    return (
      <div
        {...commonAria}
        className={cn(
          'w-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center animate-pulse',
          'min-h-[96px] sm:min-h-[40px]',
          className
        )}
      >
        <div className="h-10 flex-1 min-w-[180px] rounded bg-muted" />
        <div className="h-10 w-full sm:w-40 rounded bg-muted" />
        <div className="h-10 w-full sm:w-40 rounded bg-muted" />
        <div className="h-10 w-10 rounded bg-muted ml-auto" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'cards') {
    const n = count ?? 8;
    return (
      <div
        {...commonAria}
        className={cn(
          'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse',
          className
        )}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="rounded-lg border overflow-hidden flex flex-col min-h-[200px]">
            <div className="w-full bg-muted" style={{ aspectRatio: '16 / 9' }} />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'table') {
    const n = count ?? 6;
    return (
      <div
        {...commonAria}
        className={cn('rounded-lg border overflow-hidden animate-pulse', className)}
      >
        <div className="p-4 border-b bg-muted/50 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 flex-1 rounded bg-muted" />
          ))}
        </div>
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-0 flex gap-4 items-center min-h-[56px]">
            {Array.from({ length: 5 }).map((__, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-muted" />
            ))}
          </div>
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  // page (default)
  return (
    <div {...commonAria} className={cn('p-6 space-y-4 animate-pulse', className)}>
      <div className="h-6 w-1/3 rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-32 w-full rounded bg-muted" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default SkeletonFallback;
