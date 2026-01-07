import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery('(max-width: 639px)');
export const useIsTablet = () => useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

/**
 * Breakpoints pré-definidos alinhados com Tailwind
 */
export function useBreakpoint() {
  return {
    isMobile: useMediaQuery('(max-width: 639px)'),
    isTablet: useMediaQuery('(min-width: 640px) and (max-width: 1023px)'),
    isDesktop: useMediaQuery('(min-width: 1024px)'),
    isLargeDesktop: useMediaQuery('(min-width: 1280px)'),
    isSm: useMediaQuery('(min-width: 640px)'),
    isMd: useMediaQuery('(min-width: 768px)'),
    isLg: useMediaQuery('(min-width: 1024px)'),
    isXl: useMediaQuery('(min-width: 1280px)'),
    is2xl: useMediaQuery('(min-width: 1536px)'),
  };
}

/**
 * Detecta preferências de acessibilidade
 */
export function useAccessibilityPreferences() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersHighContrast = useMediaQuery('(prefers-contrast: high)');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return {
    prefersReducedMotion,
    prefersHighContrast,
    prefersDarkMode,
  };
}

/**
 * Detecta orientação do dispositivo
 */
export function useOrientation() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  return {
    isPortrait,
    isLandscape,
  };
}

/**
 * Detecta dispositivos touch
 */
export function useTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}
