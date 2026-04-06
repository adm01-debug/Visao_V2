/**
 * Centralized chart color palette using HSL values.
 * Used by Recharts, Canvas API, and Mapbox where raw color strings are required.
 * These mirror the design system tokens but as concrete HSL strings for chart libs.
 */

export const CHART_COLORS = {
  // Status colors
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(42, 80%, 52%)',
  destructive: 'hsl(350, 65%, 52%)',
  muted: 'hsl(215, 20%, 55%)',
  
  // Category colors  
  blue: 'hsl(217, 91%, 60%)',
  green: 'hsl(142, 71%, 45%)',
  amber: 'hsl(38, 92%, 50%)',
  violet: 'hsl(263, 90%, 64%)',
  red: 'hsl(0, 84%, 60%)',
  cyan: 'hsl(187, 96%, 42%)',
  orange: 'hsl(24, 95%, 53%)',
  gray: 'hsl(220, 9%, 46%)',
  
  // Camera status
  cameraOnline: 'hsl(142, 71%, 45%)',
  cameraOffline: 'hsl(220, 9%, 46%)',
  cameraAlert: 'hsl(0, 84%, 60%)',
  cameraWarning: 'hsl(38, 92%, 50%)',
} as const;

/** Detection type color map for Canvas/SVG overlays */
export const DETECTION_COLORS: Record<string, string> = {
  face: CHART_COLORS.green,
  person: CHART_COLORS.blue,
  vehicle: CHART_COLORS.amber,
  object: CHART_COLORS.violet,
};

/** ALPR status color map for pie charts */
export const ALPR_STATUS_COLORS: Record<string, string> = {
  authorized: CHART_COLORS.green,
  unknown: CHART_COLORS.gray,
  unauthorized: CHART_COLORS.amber,
  blacklist: CHART_COLORS.red,
};

/** Alert type color map for analytics charts */
export const ALERT_TYPE_COLORS: Record<string, string> = {
  motion: CHART_COLORS.blue,
  person: CHART_COLORS.green,
  vehicle: CHART_COLORS.amber,
  face: CHART_COLORS.violet,
  zone: CHART_COLORS.red,
  other: CHART_COLORS.gray,
};
