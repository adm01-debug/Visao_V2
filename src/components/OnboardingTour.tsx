/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: OnboardingTour
 * 
 * Tour guiado para novos usuários com:
 * - Modal de boas-vindas
 * - Passos interativos
 * - Indicadores de progresso
 * - Animações suaves
 */

import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Shield,
  Bell,
  BarChart3,
  Map,
  Settings,
  Users,
  Car,
  Zap,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Play,
  CheckCircle2,
  Eye,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOnboardingTour, TourStep } from '@/hooks/useOnboardingTour';

// ============================================
// CONFIGURAÇÃO DOS PASSOS DO TOUR
// ============================================

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao VISÃO',
    description: 'Sistema de Vigilância Inteligente com IA avançada. Vamos fazer um tour rápido pelas principais funcionalidades.',
    position: 'center',
    icon: 'shield',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Principal',
    description: 'Visualize todas as suas câmeras em tempo real, estatísticas de detecção e alertas ativos em um único lugar.',
    target: '[data-tour="dashboard"]',
    position: 'right',
    icon: 'camera',
  },
  {
    id: 'cameras',
    title: 'Câmeras ao Vivo',
    description: 'Monitore suas câmeras com streaming HLS. Clique em qualquer câmera para expandir e acessar controles avançados.',
    target: '[data-tour="cameras"]',
    position: 'bottom',
    icon: 'camera',
  },
  {
    id: 'face-detection',
    title: 'Detecção Facial com IA',
    description: 'Ative a detecção facial em tempo real clicando no ícone de scan. O sistema identifica rostos e pode alertar sobre pessoas na blacklist.',
    target: '[data-tour="face-detection"]',
    position: 'bottom',
    icon: 'brain',
  },
  {
    id: 'recording',
    title: 'Gravação de Clipes',
    description: 'Grave clipes de vídeo manualmente ou configure gravação automática baseada em eventos e alertas.',
    target: '[data-tour="recording"]',
    position: 'bottom',
    icon: 'play',
  },
  {
    id: 'alerts',
    title: 'Alertas Inteligentes',
    description: 'Receba notificações em tempo real via Telegram, som e push. Configure regras personalizadas para cada tipo de evento.',
    target: '[data-tour="alerts"]',
    position: 'left',
    icon: 'bell',
  },
  {
    id: 'alpr',
    title: 'Reconhecimento de Placas',
    description: 'O sistema ALPR detecta automaticamente placas de veículos e verifica contra listas de permitidos e bloqueados.',
    target: '[data-tour="alpr"]',
    position: 'right',
    icon: 'car',
  },
  {
    id: 'analytics',
    title: 'Analytics Avançado',
    description: 'Analise tendências, gere relatórios e visualize heatmaps de movimentação para insights de segurança.',
    target: '[data-tour="analytics"]',
    position: 'right',
    icon: 'chart',
  },
  {
    id: 'complete',
    title: 'Pronto para Começar!',
    description: 'Você completou o tour. Explore o sistema e configure suas câmeras para começar o monitoramento inteligente.',
    position: 'center',
    icon: 'check',
  },
];

// ============================================
// COMPONENTE DE ÍCONE
// ============================================

function StepIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, any> = {
    shield: Shield,
    camera: Camera,
    brain: Brain,
    play: Play,
    bell: Bell,
    car: Car,
    chart: BarChart3,
    check: CheckCircle2,
    eye: Eye,
    zap: Zap,
    map: Map,
    settings: Settings,
    users: Users,
  };

  const Icon = iconMap[icon] || Sparkles;
  return <Icon className={className} />;
}

// ============================================
// COMPONENTE DE PASSO DO TOUR
// ============================================

interface TourStepCardProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function TourStepCard({
  step,
  stepNumber,
  totalSteps,
  progress,
  onNext,
  onPrevious,
  onSkip,
  isFirst,
  isLast,
}: TourStepCardProps) {
  return (
    <div className="space-y-6">
      {/* Header com ícone */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <StepIcon icon={step.icon || 'sparkles'} className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          {/* Pulso animado */}
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
      </div>

      {/* Título e descrição */}
      <div className="text-center space-y-3">
        <h3 className="text-xl font-bold">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Indicador de progresso */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Passo {stepNumber} de {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Indicadores de passo */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === stepNumber - 1
                ? 'w-6 bg-primary'
                : i < stepNumber - 1
                ? 'bg-primary/60'
                : 'bg-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Botões de ação */}
      <div className="flex items-center gap-3 pt-2">
        {!isFirst && (
          <Button
            variant="outline"
            onClick={onPrevious}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
        )}
        
        {isFirst && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1"
          >
            Pular tour
          </Button>
        )}

        <Button
          onClick={onNext}
          className="flex-1"
        >
          {isLast ? (
            <>
              Começar
              <Zap className="w-4 h-4 ml-1" />
            </>
          ) : (
            <>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface OnboardingTourProps {
  onComplete?: () => void;
  autoStart?: boolean;
}

export function OnboardingTour({ onComplete, autoStart = true }: OnboardingTourProps) {
  const {
    isActive,
    currentStep,
    currentStepData,
    totalSteps,
    progress,
    hasCompleted,
    next,
    previous,
    skip,
    complete,
    start,
    reset,
  } = useOnboardingTour({
    steps: tourSteps,
    autoStart,
    storageKey: 'visao-onboarding-v1',
  });

  const handleNext = () => {
    if (currentStep === totalSteps - 1) {
      complete();
      onComplete?.();
    } else {
      next();
    }
  };

  const handleSkip = () => {
    skip();
    onComplete?.();
  };

  if (!isActive || !currentStepData) {
    return null;
  }

  return (
    <Dialog open={isActive} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Tour de Onboarding</DialogTitle>
        </DialogHeader>
        
        {/* Botão de fechar */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={handleSkip}
        >
          <X className="w-4 h-4" />
        </Button>

        <TourStepCard
          step={currentStepData}
          stepNumber={currentStep + 1}
          totalSteps={totalSteps}
          progress={progress}
          onNext={handleNext}
          onPrevious={previous}
          onSkip={handleSkip}
          isFirst={currentStep === 0}
          isLast={currentStep === totalSteps - 1}
        />
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// BOTÃO PARA REINICIAR TOUR
// ============================================

export function RestartTourButton({ className }: { className?: string }) {
  const [showTour, setShowTour] = useState(false);

  const handleRestart = () => {
    localStorage.removeItem('visao-onboarding-v1');
    setShowTour(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestart}
        className={className}
      >
        <Play className="w-4 h-4 mr-2" />
        Ver Tour
      </Button>
      
      {showTour && (
        <OnboardingTour 
          autoStart={true}
          onComplete={() => setShowTour(false)} 
        />
      )}
    </>
  );
}

export default OnboardingTour;
