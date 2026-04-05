import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' };
const iconSizes = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-7 h-7' };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, text }) => (
  <div className={cn('flex flex-col items-center gap-3', className)} role="status" aria-label={text || 'Carregando'}>
    <div className={cn('relative rounded-xl bg-primary/10 flex items-center justify-center', sizes[size])} style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.2)' }}>
      <Shield className={cn('text-primary animate-pulse', iconSizes[size])} />
      <div className="absolute inset-0 rounded-xl border-2 border-primary/30 animate-spin" style={{ borderTopColor: 'hsl(var(--primary))', animationDuration: '1.5s' }} />
    </div>
    {text && <span className="text-muted-foreground text-sm">{text}</span>}
    <span className="sr-only">Carregando...</span>
  </div>
);

/** Full-screen branded splash for initial app load */
export const SplashScreen = React.forwardRef<HTMLDivElement>(function SplashScreen(_props, ref) {
  return (
    <div ref={ref} className="flex flex-col items-center justify-center min-h-screen bg-background gap-6">
      <div className="relative">
        {/* Outer glow rings */}
        <div className="absolute inset-0 -m-8 rounded-full bg-primary/5 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 animate-pulse" />
        
        {/* Main icon */}
        <div className="relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center" style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.3)' }}>
          <Shield className="w-10 h-10 text-primary" />
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-spin" style={{ borderTopColor: 'hsl(var(--primary))', animationDuration: '1.5s' }} />
        </div>
      </div>
      
      {/* Brand name */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-wider text-foreground">
          VISÃO
        </h1>
        <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
          Vigilância Inteligente
        </p>
      </div>
      
      {/* Loading bar */}
      <div className="w-48 h-0.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full animate-loading-bar"
          style={{
            animation: 'loading-bar 1.5s ease-in-out infinite',
          }}
        />
      </div>
      <span className="sr-only">Carregando sistema VISÃO...</span>
    </div>
  );
});

export default LoadingSpinner;
