/**
 * VISÃO - Centralized Color Constants
 * These map to CSS custom properties defined in index.css.
 * Use semantic tokens (success, warning, destructive, primary) in components instead of raw values.
 * This file exists only for contexts that require programmatic color strings (Canvas, Mapbox, etc.).
 */

export const COLORS = {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    light: 'hsl(var(--primary) / 0.7)',
    dark: 'hsl(var(--primary))',
  },
  secondary: {
    DEFAULT: 'hsl(var(--muted-foreground))',
    light: 'hsl(var(--muted-foreground) / 0.7)',
    dark: 'hsl(var(--muted-foreground))',
  },
  success: {
    DEFAULT: 'hsl(var(--success))',
    light: 'hsl(var(--success) / 0.7)',
    dark: 'hsl(var(--success))',
  },
  warning: {
    DEFAULT: 'hsl(var(--warning))',
    light: 'hsl(var(--warning) / 0.7)',
    dark: 'hsl(var(--warning))',
  },
  danger: {
    DEFAULT: 'hsl(var(--destructive))',
    light: 'hsl(var(--destructive) / 0.7)',
    dark: 'hsl(var(--destructive))',
  },
  info: {
    DEFAULT: 'hsl(var(--primary))',
    light: 'hsl(var(--primary) / 0.7)',
    dark: 'hsl(var(--primary))',
  },
} as const;

export const ALERT_COLORS = {
  critical: COLORS.danger.DEFAULT,
  high: COLORS.warning.DEFAULT,
  medium: COLORS.info.DEFAULT,
  low: COLORS.secondary.DEFAULT,
};
