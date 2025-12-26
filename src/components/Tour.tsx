/**
 * Interactive Tour Component
 */
import React, { useState } from 'react';
import { Spotlight } from './Spotlight';
export interface TourStep { target: string; title: string; description: string; }
export const Tour: React.FC<{ steps: TourStep[]; onComplete?: () => void }> = ({ steps, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  if (!isActive || currentStep >= steps.length) return null;
  const step = steps[currentStep];
  return <Spotlight target={step.target} title={step.title} description={step.description} step={currentStep + 1} totalSteps={steps.length} onNext={() => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1); else { setIsActive(false); onComplete?.(); } }} onSkip={() => { setIsActive(false); onComplete?.(); }} />;
};
export default Tour;
