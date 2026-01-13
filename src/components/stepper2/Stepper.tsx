import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step { label: string; description?: string; }
interface StepperProps { steps: Step[]; currentStep: number; className?: string; }

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
              i < currentStep ? 'bg-primary border-primary text-primary-foreground' : i === currentStep ? 'border-primary text-primary' : 'border-muted text-muted-foreground')}>
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div><p className="text-sm font-medium">{step.label}</p>{step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}</div>
          </div>
          {i < steps.length - 1 && <div className={cn('flex-1 h-0.5 mx-4', i < currentStep ? 'bg-primary' : 'bg-muted')} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default Stepper;
