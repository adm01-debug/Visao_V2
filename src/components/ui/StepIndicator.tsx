/**
 * VISÃO - StepIndicator Component
 * Visual progress indicator for multi-step processes
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string | number;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStepIndex: number;
  className?: string;
}

export function StepIndicator({ steps, currentStepIndex, className }: StepIndicatorProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-muted w-full -z-10" 
          aria-hidden="true" 
        />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 -z-10" 
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          aria-hidden="true" 
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-background",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                  isActive ? "border-primary text-primary ring-4 ring-primary/20" : 
                  "border-muted text-muted-foreground"
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[9px] text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
