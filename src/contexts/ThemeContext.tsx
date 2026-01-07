/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ThemeContext - Re-export do ThemeProvider para compatibilidade
 * 
 * @module contexts/ThemeContext
 */

// Re-export tudo de ThemeProvider para manter compatibilidade de imports
export { ThemeProvider, useTheme, toggleTheme } from "./ThemeProvider";
export type { ThemeMode, ThemeVariant, ThemeState } from "./ThemeProvider";
