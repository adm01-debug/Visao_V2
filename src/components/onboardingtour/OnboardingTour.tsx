import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step { title: string; description: string; target?: string; image?: string; }

interface OnboardingTourProps {
  steps: Step[];
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

export function OnboardingTour({ steps, onComplete, onSkip, className }: OnboardingTourProps) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const isLast = current === steps.length - 1;

  return (
    <div className={cn('fixed inset-0 bg-black/50 z-50 flex items-center justify-center', className)}>
      <div className="bg-background rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {step.image && <div className="h-48 bg-muted flex items-center justify-center"><img src={step.image} alt="" className="max-h-full" /></div>}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Passo {current + 1} de {steps.length}</p>
              <h3 className="text-lg font-semibold">{step.title}</h3>
            </div>
            {onSkip && <button onClick={onSkip} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>}
          </div>
          <p className="text-muted-foreground mb-6">{step.description}</p>
          <div className="flex items-center gap-2">
            {current > 0 && <Button variant="outline" onClick={() => setCurrent(c => c - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>}
            <div className="flex-1 flex justify-center gap-1">
              {steps.map((_, i) => <div key={i} className={cn('w-2 h-2 rounded-full', i === current ? 'bg-primary' : 'bg-muted')} />)}
            </div>
            {isLast ? <Button onClick={onComplete}><Check className="h-4 w-4 mr-1" />Concluir</Button> : <Button onClick={() => setCurrent(c => c + 1)}>Próximo<ChevronRight className="h-4 w-4 ml-1" /></Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
