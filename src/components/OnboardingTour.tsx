/**
 * OnboardingTour (Refactored)
 * Steps extracted to ./onboarding/onboardingSteps.ts
 */
import { useState } from 'react';
import { Camera, Shield, Bell, BarChart3, Map, Settings, Users, Car, Zap, ChevronRight, ChevronLeft, X, Sparkles, Play, CheckCircle2, Eye, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnboardingTour, TourStep } from '@/hooks/useOnboardingTour';
import { tourSteps } from './onboarding/onboardingSteps';

const iconMap: Record<string, any> = { shield: Shield, camera: Camera, brain: Brain, play: Play, bell: Bell, car: Car, chart: BarChart3, check: CheckCircle2, eye: Eye, zap: Zap, map: Map, settings: Settings, users: Users };
function StepIcon({ icon, className }: { icon: string; className?: string }) { const Icon = iconMap[icon] || Sparkles; return <Icon className={className} />; }

function TourStepCard({ step, stepNumber, totalSteps, progress, onNext, onPrevious, onSkip, isFirst, isLast }: {
  step: TourStep; stepNumber: number; totalSteps: number; progress: number; onNext: () => void; onPrevious: () => void; onSkip: () => void; isFirst: boolean; isLast: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center"><StepIcon icon={step.icon || 'sparkles'} className="w-7 h-7 text-primary-foreground" /></div></div>
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
      </div>
      <div className="text-center space-y-3"><h3 className="text-xl font-bold">{step.title}</h3><p className="text-muted-foreground leading-relaxed">{step.description}</p></div>
      <div className="space-y-2"><div className="flex justify-between text-xs text-muted-foreground"><span>Passo {stepNumber} de {totalSteps}</span><span>{Math.round(progress)}%</span></div><Progress value={progress} className="h-2" /></div>
      <div className="flex justify-center gap-1.5">{Array.from({ length: totalSteps }).map((_, i) => <div key={i} className={cn('w-2 h-2 rounded-full transition-all', i === stepNumber - 1 ? 'w-6 bg-primary' : i < stepNumber - 1 ? 'bg-primary/60' : 'bg-muted-foreground/30')} />)}</div>
      <div className="flex items-center gap-3 pt-2">
        {!isFirst && <Button variant="outline" onClick={onPrevious} className="flex-1"><ChevronLeft className="w-4 h-4 mr-1" />Anterior</Button>}
        {isFirst && <Button variant="ghost" onClick={onSkip} className="flex-1">Pular tour</Button>}
        <Button onClick={onNext} className="flex-1">{isLast ? <>Começar<Zap className="w-4 h-4 ml-1" /></> : <>Próximo<ChevronRight className="w-4 h-4 ml-1" /></>}</Button>
      </div>
    </div>
  );
}

interface OnboardingTourProps { onComplete?: () => void; autoStart?: boolean; }

export function OnboardingTour({ onComplete, autoStart = true }: OnboardingTourProps) {
  const { isActive, currentStep, currentStepData, totalSteps, progress, next, previous, skip, complete } = useOnboardingTour({ steps: tourSteps, autoStart, storageKey: 'visao-onboarding-v1' });
  const handleNext = () => { if (currentStep === totalSteps - 1) { complete(); onComplete?.(); } else next(); };
  const handleSkip = () => { skip(); onComplete?.(); };
  if (!isActive || !currentStepData) return null;
  return (
    <Dialog open={isActive} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only"><DialogTitle>Tour de Onboarding</DialogTitle></DialogHeader>
        <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={handleSkip}><X className="w-4 h-4" /></Button>
        <TourStepCard step={currentStepData} stepNumber={currentStep + 1} totalSteps={totalSteps} progress={progress} onNext={handleNext} onPrevious={previous} onSkip={handleSkip} isFirst={currentStep === 0} isLast={currentStep === totalSteps - 1} />
      </DialogContent>
    </Dialog>
  );
}

export function RestartTourButton({ className }: { className?: string }) {
  const [showTour, setShowTour] = useState(false);
  return (<>{<Button variant="outline" size="sm" onClick={() => { localStorage.removeItem('visao-onboarding-v1'); setShowTour(true); }} className={className}><Play className="w-4 h-4 mr-2" />Ver Tour</Button>}{showTour && <OnboardingTour autoStart onComplete={() => setShowTour(false)} />}</>);
}

export default OnboardingTour;
