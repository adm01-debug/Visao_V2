/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook e Componente: Theme Provider
 * 
 * Gerencia o tema da aplicação (dark/light/system)
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ============================================
// TIPOS
// ============================================

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// ============================================
// CONTEXTO
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'visao-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Recuperar do localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        return stored;
      }
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  // Resolver tema baseado em preferência do sistema
  useEffect(() => {
    const root = window.document.documentElement;

    // Remover classes antigas
    root.classList.remove('light', 'dark');

    let resolved: 'dark' | 'light';

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      resolved = systemTheme;
    } else {
      resolved = theme;
    }

    // Aplicar tema
    root.classList.add(resolved);
    setResolvedTheme(resolved);

    // Atualizar meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolved === 'dark' ? '#0f172a' : '#ffffff'
      );
    }
  }, [theme]);

  // Ouvir mudanças na preferência do sistema
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      const newTheme = e.matches ? 'dark' : 'light';
      root.classList.add(newTheme);
      setResolvedTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Função para definir tema
  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  // Toggle entre dark e light
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
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
// COMPONENTE: Theme Toggle Button
// ============================================

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({
  variant = 'button',
  size = 'icon',
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // Versão simples: botão que alterna
  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        className={cn('relative', className)}
        title={resolvedTheme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      >
        <Sun className={cn(
          'h-5 w-5 transition-all',
          resolvedTheme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
        )} />
        <Moon className={cn(
          'absolute h-5 w-5 transition-all',
          resolvedTheme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
        )} />
        {showLabel && (
          <span className="ml-2">
            {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        )}
        <span className="sr-only">Alternar tema</span>
      </Button>
    );
  }

  // Versão dropdown: permite escolher dark/light/system
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={size} className={className}>
          <Sun className={cn(
            'h-5 w-5 transition-all',
            resolvedTheme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
          )} />
          <Moon className={cn(
            'absolute h-5 w-5 transition-all',
            resolvedTheme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
          )} />
          {showLabel && (
            <span className="ml-2">Tema</span>
          )}
          <span className="sr-only">Selecionar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={cn(theme === 'light' && 'bg-accent')}
        >
          <Sun className="w-4 h-4 mr-2" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={cn(theme === 'dark' && 'bg-accent')}
        >
          <Moon className="w-4 h-4 mr-2" />
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={cn(theme === 'system' && 'bg-accent')}
        >
          <Monitor className="w-4 h-4 mr-2" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// COMPONENTE: Theme Selector (Cards)
// ============================================

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: any; description: string }[] = [
    {
      value: 'light',
      label: 'Claro',
      icon: Sun,
      description: 'Tema claro para ambientes iluminados',
    },
    {
      value: 'dark',
      label: 'Escuro',
      icon: Moon,
      description: 'Tema escuro para reduzir fadiga ocular',
    },
    {
      value: 'system',
      label: 'Sistema',
      icon: Monitor,
      description: 'Segue a preferência do seu sistema',
    },
  ];

  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      {themes.map(({ value, label, icon: Icon, description }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
            theme === value
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          {/* Preview */}
          <div className={cn(
            'w-full aspect-video rounded-md overflow-hidden',
            value === 'dark' ? 'bg-slate-900' : value === 'light' ? 'bg-white' : 'bg-gradient-to-r from-white to-slate-900'
          )}>
            <div className="flex h-full">
              <div className={cn(
                'w-1/4 h-full',
                value === 'dark' ? 'bg-slate-800' : value === 'light' ? 'bg-slate-100' : 'bg-gradient-to-b from-slate-100 to-slate-800'
              )} />
              <div className="flex-1 p-1">
                <div className={cn(
                  'h-2 w-3/4 rounded-sm mb-1',
                  value === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                )} />
                <div className={cn(
                  'h-1 w-1/2 rounded-sm',
                  value === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                )} />
              </div>
            </div>
          </div>

          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{label}</span>
          
          {/* Check indicator */}
          {theme === value && (
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <svg
                className="w-3 h-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export type { Theme, ThemeContextType };
