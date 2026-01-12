import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
              i < currentStep ? 'bg-primary border-primary text-white' :
              i === currentStep ? 'border-primary text-primary' :
              'border-gray-300 text-gray-500'
            )}>
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="ml-2">
              <div className={cn('text-sm font-medium', i <= currentStep ? 'text-foreground' : 'text-muted-foreground')}>{step.title}</div>
              {step.description && <div className="text-xs text-muted-foreground">{step.description}</div>}
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-4', i < currentStep ? 'bg-primary' : 'bg-gray-200')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default Stepper;
