import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step { label: string; description?: string; }

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-medium border-2 transition-colors',
              i < currentStep ? 'bg-primary border-primary text-primary-foreground' :
              i === currentStep ? 'border-primary text-primary' : 'border-muted text-muted-foreground')}>
              {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <span className={cn('text-sm mt-2', i <= currentStep ? 'text-foreground' : 'text-muted-foreground')}>{step.label}</span>
            {step.description && <span className="text-xs text-muted-foreground">{step.description}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-1 mx-2', i < currentStep ? 'bg-primary' : 'bg-muted')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default StepProgress;
