/**
 * VISÃO - Sistema de Vigilância Inteligente
 * ThemeProvider - Sistema completo de temas
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

// ============================================
// TIPOS
// ============================================

export type ThemeMode = 'dark' | 'light' | 'system';
export type ThemeVariant = 'default' | 'soc' | 'midnight' | 'contrast' | 'industrial';

interface ThemeState {
  mode: ThemeMode;
  variant: ThemeVariant;
}

interface ThemeContextType extends ThemeState {
  setMode: (mode: ThemeMode) => void;
  setVariant: (variant: ThemeVariant) => void;
  toggleMode: () => void;
  isDark: boolean;
  // Aliases para compatibilidade
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  defaultVariant?: ThemeVariant;
  storageKey?: string;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = 'visao-theme';

const defaultState: ThemeState = {
  mode: 'dark',
  variant: 'default',
};

// ============================================
// CONTEXTO
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================
// HELPERS
// ============================================

function getStoredTheme(): ThemeState {
  if (typeof window === 'undefined') return defaultState;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultState;
}

function getSystemDarkPreference(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ============================================
// PROVIDER
// ============================================

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  defaultVariant = 'default',
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [state, setState] = useState<ThemeState>(() => {
    const stored = getStoredTheme();
    return {
      mode: stored.mode || defaultTheme,
      variant: stored.variant || defaultVariant,
    };
  });

  const [isDark, setIsDark] = useState(() => {
    const stored = getStoredTheme();
    return stored.mode === 'dark' || (stored.mode === 'system' && getSystemDarkPreference());
  });

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Add transition class
    root.classList.add('theme-transition');
    
    // Determine if dark mode
    const shouldBeDark = state.mode === 'dark' || (state.mode === 'system' && getSystemDarkPreference());
    setIsDark(shouldBeDark);
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'theme-soc', 'theme-midnight', 'theme-contrast', 'theme-industrial');
    
    // Apply dark/light class
    root.classList.add(shouldBeDark ? 'dark' : 'light');
    
    // Apply variant class if not default
    if (state.variant !== 'default') {
      root.classList.add(`theme-${state.variant}`);
    }
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', shouldBeDark ? '#0f172a' : '#ffffff');
    }
    
    // Remove transition class after animation
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [state.mode, state.variant]);

  // Listen for system preference changes
  useEffect(() => {
    if (state.mode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
      setIsDark(e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [state.mode]);

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const setMode = useCallback((mode: ThemeMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const setVariant = useCallback((variant: ThemeVariant) => {
    setState(prev => ({ ...prev, variant }));
  }, []);

  const toggleMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: (prev.mode === 'dark' || (prev.mode === 'system' && getSystemDarkPreference())) 
        ? 'light' 
        : 'dark',
    }));
  }, []);

  const resolvedTheme = isDark ? 'dark' : 'light';

  const value: ThemeContextType = {
    ...state,
    setMode,
    setVariant,
    toggleMode,
    isDark,
    // Aliases para compatibilidade
    theme: state.mode,
    resolvedTheme,
    setTheme: setMode,
    toggleTheme: toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// ============================================
// EXPORTS
// ============================================

export type { ThemeState, ThemeContextType };
