export const THEME_CONFIG = {
  defaultTheme: 'dark' as const,
  storageKey: 'visao-theme',
  themes: ['light', 'dark', 'system'] as const,
};

export type Theme = typeof THEME_CONFIG.themes[number];
