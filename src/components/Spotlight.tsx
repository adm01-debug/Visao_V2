/**
 * Spotlight Component for Onboarding
 */
import React from 'react';
import { cn } from '@/utils/cn';
export interface SpotlightProps { target: string; title: string; description: string; onNext?: () => void; onSkip?: () => void; step?: number; totalSteps?: number; }
export const Spotlight: React.FC<SpotlightProps> = ({ target, title, description, onNext, onSkip, step = 1, totalSteps = 1 }) => {
  const el = document.querySelector(target);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.left}px ${rect.top}px, ${rect.left}px ${rect.bottom}px, ${rect.right}px ${rect.bottom}px, ${rect.right}px ${rect.top}px, ${rect.left}px ${rect.top}px)` }} />
      <div className="absolute bg-white rounded-lg p-4 shadow-xl max-w-sm" style={{ top: rect.bottom + 16, left: rect.left }}>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground mt-1">{description}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">{step}/{totalSteps}</span>
          <div className="flex gap-2">
            {onSkip && <button onClick={onSkip} className="px-3 py-1 text-sm">Pular</button>}
            {onNext && <button onClick={onNext} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">Próximo</button>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Spotlight;
