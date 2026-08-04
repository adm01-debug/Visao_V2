import { TourStep } from '@/hooks/useOnboardingTour';

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao VISÃO',
    description:
      'Sistema de Vigilância Inteligente com IA avançada. Vamos fazer um tour rápido pelas principais funcionalidades.',
    position: 'center',
    icon: 'shield',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Principal',
    description:
      'Visualize todas as suas câmeras em tempo real, estatísticas de detecção e alertas ativos em um único lugar.',
    target: '[data-tour="dashboard"]',
    position: 'right',
    icon: 'camera',
  },
  {
    id: 'cameras',
    title: 'Câmeras ao Vivo',
    description:
      'Monitore suas câmeras com streaming HLS. Clique em qualquer câmera para expandir e acessar controles avançados.',
    target: '[data-tour="cameras"]',
    position: 'bottom',
    icon: 'camera',
  },
  {
    id: 'face-detection',
    title: 'Detecção Facial com IA',
    description:
      'Ative a detecção facial em tempo real clicando no ícone de scan. O sistema identifica rostos e pode alertar sobre pessoas na blacklist.',
    target: '[data-tour="face-detection"]',
    position: 'bottom',
    icon: 'brain',
  },
  {
    id: 'recording',
    title: 'Gravação de Clipes',
    description:
      'Grave clipes de vídeo manualmente ou configure gravação automática baseada em eventos e alertas.',
    target: '[data-tour="recording"]',
    position: 'bottom',
    icon: 'play',
  },
  {
    id: 'alerts',
    title: 'Alertas Inteligentes',
    description:
      'Receba notificações em tempo real via Telegram, som e push. Configure regras personalizadas para cada tipo de evento.',
    target: '[data-tour="alerts"]',
    position: 'left',
    icon: 'bell',
  },
  {
    id: 'alpr',
    title: 'Reconhecimento de Placas',
    description:
      'O sistema ALPR detecta automaticamente placas de veículos e verifica contra listas de permitidos e bloqueados.',
    target: '[data-tour="alpr"]',
    position: 'right',
    icon: 'car',
  },
  {
    id: 'analytics',
    title: 'Analytics Avançado',
    description:
      'Analise tendências, gere relatórios e visualize heatmaps de movimentação para insights de segurança.',
    target: '[data-tour="analytics"]',
    position: 'right',
    icon: 'chart',
  },
  {
    id: 'complete',
    title: 'Pronto para Começar!',
    description:
      'Você completou o tour. Explore o sistema e configure suas câmeras para começar o monitoramento inteligente.',
    position: 'center',
    icon: 'check',
  },
];
