/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: TourHighlight
 * 
 * Wrapper que adiciona marcadores e highlights 
 * para elementos do tour de onboarding
 */

import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TourHighlightProps {
  tourId: string;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
  ring?: boolean;
}

/**
 * Wrapper que marca elementos para o tour de onboarding
 * 
 * Uso:
 * <TourHighlight tourId="cameras">
 *   <CameraGrid />
 * </TourHighlight>
 */
export const TourHighlight = forwardRef<HTMLDivElement, TourHighlightProps>(
  ({ tourId, children, className, pulse = false, ring = false }, ref) => {
    return (
      <div
        ref={ref}
        data-tour={tourId}
        className={cn(
          'relative',
          pulse && 'tour-pulse',
          ring && 'ring-2 ring-primary ring-offset-2',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

TourHighlight.displayName = 'TourHighlight';

// CSS para animação de pulse (adicionar ao index.css)
export const tourStyles = `
/* Tour highlight animations */
.tour-pulse {
  animation: tourPulse 2s ease-in-out infinite;
}

@keyframes tourPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
  }
}

/* Tour spotlight overlay */
.tour-spotlight {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}

.tour-spotlight::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
}

/* Tour target highlight */
[data-tour-active="true"] {
  position: relative;
  z-index: 50;
  box-shadow: 0 0 0 4px var(--primary), 0 0 20px rgba(59, 130, 246, 0.5);
  border-radius: 8px;
}
`;

export default TourHighlight;
