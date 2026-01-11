/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ThemeContext - Re-export do ThemeProvider para compatibilidade
 * 
 * @module contexts/ThemeContext
 */

// Re-export tudo de ThemeProvider para manter compatibilidade de imports
export { ThemeProvider, useTheme } from "./ThemeProvider";
export type { ThemeMode, ThemeVariant, ThemeState, ThemeContextType } from "./ThemeProvider";

// Helper function for legacy compatibility
export const toggleTheme = () => {
é deprecated. Use useTheme().toggleMode() ao invés.');
};
