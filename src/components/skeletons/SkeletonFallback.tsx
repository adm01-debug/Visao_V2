/**
 * SkeletonFallback - Skeleton genérico mínimo, sem dependências externas.
 * Usado como último recurso quando um skeleton branded falha ao montar.
 */
import { cn } from '@/lib/utils';

interface SkeletonFallbackProps {
  label?: string;
  className?: string;
}

export function SkeletonFallback({
  label = 'Carregando…',
  className,
}: SkeletonFallbackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn('p-6 space-y-4 animate-pulse', className)}
    >
      <div className="h-6 w-1/3 rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-32 w-full rounded bg-muted" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default SkeletonFallback;
