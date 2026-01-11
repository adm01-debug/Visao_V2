import { useState, useEffect, useCallback } from 'react';
import { safeExecute } from '@/lib/safeExecute';

type Theme = 'light' | 'dark' | 'system';

interface UseDarkModeReturn {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'theme-preference';

export const useDarkMode = (defaultTheme: Theme = 'system'): UseDarkModeReturn => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (localStorage.getItem(STORAGE_KEY) as Theme) || defaultTheme;
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateDarkMode = () => {
      const shouldBeDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      setIsDark(shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateDarkMode();
    mediaQuery.addEventListener('change', updateDarkMode);

    return () => mediaQuery.removeEventListener('change', updateDarkMode);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return { theme, isDark, setTheme, toggle };
};

export default useDarkMode;
