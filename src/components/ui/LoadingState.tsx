/**
 * VISÃO — LoadingState
 *
 * Coleção de skeletons/spinners acessíveis. Refatorado para reduzir
 * duplicação via `StatusRegion` (wrapper aria-live + sr-only) mantendo
 * 100% da API pública e o mesmo comportamento visual.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

interface StatusRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  as?: 'div';
  children: React.ReactNode;
}

/**
 * Wrapper acessível padrão para regiões de loading.
 * Aplica role/aria-live/aria-busy/aria-label + sr-only redundante.
 */
function StatusRegion({ label, className, children, ...rest }: StatusRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={className}
      {...rest}
    >
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

const fadeIn = (i: number, axis: 'x' | 'y' | 'none' = 'y') => ({
  initial: { opacity: 0, ...(axis === 'y' ? { y: 20 } : axis === 'x' ? { x: -20 } : {}) },
  animate: { opacity: 1, ...(axis === 'y' ? { y: 0 } : axis === 'x' ? { x: 0 } : {}) },
  transition: { delay: i * 0.05, duration: 0.3 },
});

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-muted rounded-md', animate && 'animate-pulse', className)}
    />
  );
}

export function Shimmer({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative overflow-hidden bg-muted rounded-md', className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeletons                                                                   */
/* -------------------------------------------------------------------------- */

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <StatusRegion
      label="Carregando cartão…"
      className={cn('p-4 rounded-lg border border-border bg-card min-h-[120px]', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <Shimmer className="h-5 w-24" />
        <Shimmer className="h-8 w-8 rounded-full" />
      </div>
      <Shimmer className="h-8 w-16 mb-2" />
      <Shimmer className="h-4 w-32" />
    </StatusRegion>
  );
}

export function CameraGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <StatusRegion
      label="Carregando câmeras…"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          {...fadeIn(i)}
          className="rounded-lg border border-border bg-card overflow-hidden"
        >
          <div className="relative">
            <Shimmer className="aspect-video w-full" />
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ animation: 'skeleton-brand-pulse 3s ease-in-out infinite' }}
            >
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="p-3 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
        </motion.div>
      ))}
    </StatusRegion>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <StatusRegion label="Carregando lista…" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          {...fadeIn(i, 'x')}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
        >
          <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
          <Shimmer className="h-6 w-16 rounded-full" />
        </motion.div>
      ))}
    </StatusRegion>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <StatusRegion label="Carregando tabela…" className="rounded-lg border border-border overflow-hidden">
      <div className="flex bg-muted/50 p-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          aria-hidden="true"
          {...fadeIn(rowIndex, 'none')}
          className="flex p-3 gap-4 border-t border-border"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Shimmer key={colIndex} className="h-4 flex-1" />
          ))}
        </motion.div>
      ))}
    </StatusRegion>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <StatusRegion label="Carregando estatísticas…" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </StatusRegion>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <StatusRegion
      label="Carregando gráfico…"
      className={cn('p-4 rounded-lg border border-border bg-card', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <Shimmer className="h-5 w-32" />
        <div className="flex gap-2">
          <Shimmer className="h-8 w-16 rounded-md" />
          <Shimmer className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => {
          // Deterministic pseudo-random height per bar (stable across renders).
          const h = 25 + ((i * 53 + 17) % 70);
          return (
            <motion.div
              key={i}
              aria-hidden="true"
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="flex-1 bg-muted rounded-t"
            />
          );
        })}
      </div>
    </StatusRegion>
  );
}

export function PageLoadingSkeleton() {
  return (
    <StatusRegion label="Carregando página…" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48" />
          <Shimmer className="h-4 w-64" />
        </div>
        <Shimmer className="h-10 w-32 rounded-md" />
      </div>
      <StatsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ListSkeleton count={4} />
      </div>
    </StatusRegion>
  );
}

/* -------------------------------------------------------------------------- */
/* Spinner / Overlay / Progress                                                */
/* -------------------------------------------------------------------------- */

const SPINNER_SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
} as const;

interface SpinnerProps {
  size?: keyof typeof SPINNER_SIZE_CLASSES;
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <motion.div
      role="status"
      aria-label="Carregando…"
      className={cn('rounded-full border-primary/30 border-t-primary', SPINNER_SIZE_CLASSES[size], className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = 'Carregando...', className }: LoadingOverlayProps) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50',
        className,
      )}
    >
      <Spinner size="lg" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-sm text-muted-foreground"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ progress, showLabel = true, className }: ProgressBarProps) {
  const value = Math.round(progress);
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{value}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 bg-muted rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
