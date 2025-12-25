export type Theme = 'light' | 'dark' | 'system';
export interface ThemeConfig { colors: Record<string, string>; fonts: Record<string, string>; spacing: Record<string, string>; }
