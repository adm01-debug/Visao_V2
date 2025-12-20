/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useOnboardingTour
 * 
 * Gerencia o estado do tour de onboarding para novos usuários
 */

import { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector do elemento alvo
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string; // Ação sugerida (ex: "Clique aqui")
  icon?: string;
}

interface UseOnboardingTourOptions {
  steps: TourStep[];
  storageKey?: string;
  autoStart?: boolean;
}

interface UseOnboardingTourReturn {
  isActive: boolean;
  currentStep: number;
  currentStepData: TourStep | null;
  totalSteps: number;
  progress: number;
  hasCompleted: boolean;
  start: () => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
  complete: () => void;
  reset: () => void;
  goToStep: (step: number) => void;
}

export function useOnboardingTour({
  steps,
  storageKey = 'visao-onboarding-completed',
  autoStart = false,
}: UseOnboardingTourOptions): UseOnboardingTourReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Verificar se já completou o tour
  useEffect(() => {
    const completed = localStorage.getItem(storageKey) === 'true';
    setHasCompleted(completed);
    
    if (autoStart && !completed) {
      // Delay para garantir que a UI foi renderizada
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [storageKey, autoStart]);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Último passo - completar
      setIsActive(false);
      setHasCompleted(true);
      localStorage.setItem(storageKey, 'true');
    }
  }, [currentStep, steps.length, storageKey]);

  const previous = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
    setHasCompleted(true);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  const complete = useCallback(() => {
    setIsActive(false);
    setHasCompleted(true);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasCompleted(false);
    setCurrentStep(0);
  }, [storageKey]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  const currentStepData = steps[currentStep] || null;
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  return {
    isActive,
    currentStep,
    currentStepData,
    totalSteps: steps.length,
    progress,
    hasCompleted,
    start,
    next,
    previous,
    skip,
    complete,
    reset,
    goToStep,
  };
}

export default useOnboardingTour;
