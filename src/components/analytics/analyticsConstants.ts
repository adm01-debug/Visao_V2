export const ANALYTICS_COLORS = {
  primary: 'hsl(168, 84%, 44%)',
  destructive: 'hsl(0, 72%, 51%)',
  warning: 'hsl(38, 92%, 50%)',
  success: 'hsl(142, 76%, 36%)',
  muted: 'hsl(215, 20%, 55%)',
  secondary: 'hsl(222, 30%, 24%)',
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: ANALYTICS_COLORS.muted,
  medium: ANALYTICS_COLORS.warning,
  high: 'hsl(24, 95%, 53%)',
  critical: ANALYTICS_COLORS.destructive,
};

export const TYPE_COLORS: Record<string, string> = {
  security: ANALYTICS_COLORS.destructive,
  safety: ANALYTICS_COLORS.warning,
  operations: ANALYTICS_COLORS.primary,
  access: 'hsl(263, 90%, 64%)',
  analytics: 'hsl(187, 96%, 42%)',
};

export const TYPE_LABELS: Record<string, string> = {
  security: 'Segurança',
  safety: 'EPI',
  operations: 'Operações',
  access: 'Acesso',
  analytics: 'Analytics',
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico',
};

export const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(222, 47%, 10%)',
  border: '1px solid hsl(222, 30%, 20%)',
  borderRadius: '8px',
};
