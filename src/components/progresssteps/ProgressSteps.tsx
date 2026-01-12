import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  completed?: boolean;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
              i < currentStep ? 'bg-primary border-primary text-white' :
              i === currentStep ? 'border-primary text-primary bg-background' :
              'border-muted text-muted-foreground'
            )}>
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn(
              'mt-1 text-xs',
              i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
            )}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-2', i < currentStep ? 'bg-primary' : 'bg-muted')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default ProgressSteps;
