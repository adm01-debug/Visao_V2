export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeVariant = 
  | 'default'
  | 'soc'
  | 'midnight'
  | 'contrast'
  | 'industrial';

export interface ThemeConfig {
  id: ThemeVariant;
  name: string;
  description: string;
  icon: string;
  previewColors: {
    background: string;
    primary: string;
    accent: string;
  };
}

export const THEME_VARIANTS: ThemeConfig[] = [
  {
    id: 'default',
    name: 'Profissional',
    description: 'Tema padrão equilibrado para uso geral',
    icon: '💼',
    previewColors: {
      background: '#0f172a',
      primary: '#3b82f6',
      accent: '#1e293b',
    },
  },
  {
    id: 'soc',
    name: 'Centro de Operações',
    description: 'Otimizado para salas de monitoramento 24/7',
    icon: '🛡️',
    previewColors: {
      background: '#0d1117',
      primary: '#22c55e',
      accent: '#21262d',
    },
  },
  {
    id: 'midnight',
    name: 'Azul Noturno',
    description: 'Tons de azul para ambientes escuros',
    icon: '🌙',
    previewColors: {
      background: '#0f1729',
      primary: '#0ea5e9',
      accent: '#1e2a4a',
    },
  },
  {
    id: 'contrast',
    name: 'Alto Contraste',
    description: 'Máxima visibilidade e acessibilidade',
    icon: '⚡',
    previewColors: {
      background: '#000000',
      primary: '#facc15',
      accent: '#262626',
    },
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Tons quentes para ambientes industriais',
    icon: '🏭',
    previewColors: {
      background: '#1a1410',
      primary: '#f97316',
      accent: '#2d241e',
    },
  },
];

export interface ThemeState {
  mode: ThemeMode;
  variant: ThemeVariant;
}
