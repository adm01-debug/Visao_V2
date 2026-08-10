/**
 * Premium camera placeholder thumbnail with animated grid pattern
 * and elegant iconography for offline/no-stream cameras.
 */
import { Camera, WifiOff, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraPlaceholderProps {
  isOnline?: boolean;
  compact?: boolean;
  className?: string;
}

export function CameraPlaceholder({
  isOnline = false,
  compact = false,
  className,
}: CameraPlaceholderProps) {
  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        'bg-gradient-to-br from-surface-sunken via-muted/30 to-surface-sunken',
        className
      )}
    >
      {/* Subtle animated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: compact ? '16px 16px' : '24px 24px',
        }}
      />

      {/* Radial glow behind icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'rounded-full',
            compact ? 'w-16 h-16' : 'w-24 h-24',
            'bg-gradient-to-br from-primary/[0.06] to-transparent blur-xl'
          )}
        />
      </div>

      {/* Center icon group */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div
          className={cn(
            'relative flex items-center justify-center rounded-xl',
            'bg-muted/40 backdrop-blur-sm border border-border/30',
            'transition-all duration-300 group-hover:bg-muted/60 group-hover:border-border/50 group-hover:scale-105',
            compact ? 'w-10 h-10' : 'w-14 h-14'
          )}
        >
          <Camera
            className={cn(
              'text-muted-foreground/40 transition-colors duration-300 group-hover:text-muted-foreground/60',
              compact ? 'w-5 h-5' : 'w-7 h-7'
            )}
          />

          {/* Status indicator overlay */}
          <div
            className={cn(
              'absolute -bottom-1 -right-1 rounded-full border-2 border-card flex items-center justify-center',
              compact ? 'w-4 h-4' : 'w-5 h-5',
              isOnline ? 'bg-warning/80' : 'bg-muted-foreground/30'
            )}
          >
            {isOnline ? (
              <Signal
                className={cn(compact ? 'w-2 h-2' : 'w-2.5 h-2.5', 'text-warning-foreground')}
              />
            ) : (
              <WifiOff className={cn(compact ? 'w-2 h-2' : 'w-2.5 h-2.5', 'text-card')} />
            )}
          </div>
        </div>

        {!compact && (
          <span className="text-[10px] font-medium text-muted-foreground/30 tracking-wider uppercase select-none">
            {isOnline ? 'Sem stream' : 'Offline'}
          </span>
        )}
      </div>

      {/* Corner decorative elements */}
      <svg
        className="absolute top-2 left-2 w-4 h-4 text-muted-foreground/10"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M0 4V0h4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg
        className="absolute bottom-2 right-2 w-4 h-4 text-muted-foreground/10 rotate-180"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M0 4V0h4" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-scan-line" />
      </div>
    </div>
  );
}
