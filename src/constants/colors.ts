export const COLORS = {
  primary: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
  secondary: { DEFAULT: '#64748b', light: '#94a3b8', dark: '#475569' },
  success: { DEFAULT: '#22c55e', light: '#4ade80', dark: '#16a34a' },
  warning: { DEFAULT: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
  danger: { DEFAULT: '#ef4444', light: '#f87171', dark: '#dc2626' },
  info: { DEFAULT: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
} as const;

export const ALERT_COLORS = { critical: COLORS.danger.DEFAULT, high: COLORS.warning.DEFAULT, medium: COLORS.info.DEFAULT, low: COLORS.secondary.DEFAULT };
